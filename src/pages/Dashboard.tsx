import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PreferenceStats {
  totalStudents: number;
  mostPopularClass: string;
  mostPopularDay: string;
  mostPopularTime: string;
  mostUnavailableDay: string;
  mostUnavailableTime: string;
}

const Dashboard = () => {
  const [favoriteClassesData, setFavoriteClassesData] = useState([]);
  const [firstChoiceData, setFirstChoiceData] = useState([]);
  const [timeBlocksData, setTimeBlocksData] = useState([]);
  const [classChoicesDistribution, setClassChoicesDistribution] = useState([]);
  const [preferredDaysData, setPreferredDaysData] = useState([]);
  const [stats, setStats] = useState<PreferenceStats | null>(null);
  const [timeByDayMatrix, setTimeByDayMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const allTimeBlocks = [
    "10:00 - 11:00",
    "10:30 - 11:30",
    "16:00 - 17:00",
    "16:30 - 17:30",
    "17:00 - 18:00",
    "17:30 - 18:30",
    "18:00 - 19:00",
    "18:30 - 19:30",
    "19:00 - 20:00",
    "19:30 - 20:30",
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("class_preferences")
        .select("*");

      if (error) throw error;

      // Process data for overall stats
      const totalStudents = data.length;

      // Process data for favorite classes (all choices)
      const classesCount: { [key: string]: number } = {};
      data.forEach((preference) => {
        [
          preference.favorite_class_1,
          preference.favorite_class_2,
          preference.favorite_class_3,
          preference.favorite_class_4,
          preference.favorite_class_5,
        ].forEach((className) => {
          classesCount[className] = (classesCount[className] || 0) + 1;
        });
      });

      // Process first choice data
      const firstChoiceCount: { [key: string]: number } = {};
      data.forEach((preference) => {
        const className = preference.favorite_class_1;
        firstChoiceCount[className] = (firstChoiceCount[className] || 0) + 1;
      });

      // Process class choices distribution
      const choicesDistribution = [];
      for (let i = 1; i <= 5; i++) {
        const choiceCount: { [key: string]: number } = {};
        data.forEach((preference) => {
          const className = preference[`favorite_class_${i}`];
          choiceCount[className] = (choiceCount[className] || 0) + 1;
        });
        choicesDistribution.push({
          choice: i,
          distribution: choiceCount,
        });
      }

      // Process preferred days data
      const daysCount: { [key: string]: number } = {};
      const unavailableDaysCount: { [key: string]: number } = {};
      data.forEach((preference) => {
        preference.preferred_days.forEach((day: string) => {
          daysCount[day] = (daysCount[day] || 0) + 1;
        });
        preference.unavailable_days.forEach((day: string) => {
          unavailableDaysCount[day] = (unavailableDaysCount[day] || 0) + 1;
        });
      });

      // Process time blocks data
      const timeBlocks: { [key: string]: number } = {};
      data.forEach((preference) => {
        preference.time_blocks.forEach((block: string) => {
          timeBlocks[block] = (timeBlocks[block] || 0) + 1;
        });
      });

      // Melhorar o processamento da matriz de frequência
      const timeByDay: { [key: string]: { [key: string]: number } } = {};
      const allDays = [
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
        "Domingo",
      ];

      // Inicializar a matriz com zeros
      allDays.forEach((day) => {
        timeByDay[day] = {};
        allTimeBlocks.forEach((time) => {
          timeByDay[day][time] = 0;
        });
      });

      // Contar as frequências
      data.forEach((preference) => {
        // Para cada dia preferido que não está na lista de indisponíveis
        preference.preferred_days.forEach((day) => {
          if (!preference.unavailable_days.includes(day)) {
            // Para cada horário disponível do aluno
            preference.time_blocks.forEach((time) => {
              if (timeByDay[day] && allTimeBlocks.includes(time)) {
                timeByDay[day][time] += 1;
              }
            });
          }
        });
      });

      // Criar a matriz final
      const matrix = allDays.map((day) => {
        const row = { day };
        allTimeBlocks.forEach((time) => {
          row[time] = timeByDay[day][time] || 0;
        });
        return row;
      });

      // Calculate most popular/unavailable stats
      const mostPopularClass = Object.entries(classesCount).sort(
        (a, b) => b[1] - a[1]
      )[0][0];
      const mostPopularDay = Object.entries(daysCount).sort(
        (a, b) => b[1] - a[1]
      )[0][0];
      const mostPopularTime = Object.entries(timeBlocks).sort(
        (a, b) => b[1] - a[1]
      )[0][0];
      const mostUnavailableDay = Object.entries(unavailableDaysCount).sort(
        (a, b) => b[1] - a[1]
      )[0][0];

      // Transform data for charts
      const favoriteClasses = Object.entries(classesCount).map(
        ([name, count]) => ({
          name,
          count,
        })
      );
      const firstChoiceClasses = Object.entries(firstChoiceCount).map(
        ([name, count]) => ({
          name,
          count,
        })
      );
      const timeBlocksArray = Object.entries(timeBlocks).map(
        ([time, count]) => ({
          time,
          count,
        })
      );
      const preferredDaysArray = Object.entries(daysCount).map(
        ([day, count]) => ({
          day,
          count,
        })
      );

      // Update state
      setFavoriteClassesData(favoriteClasses);
      setFirstChoiceData(firstChoiceClasses);
      setTimeBlocksData(timeBlocksArray);
      setClassChoicesDistribution(choicesDistribution);
      setPreferredDaysData(preferredDaysArray);
      setTimeByDayMatrix(matrix);
      setStats({
        totalStudents,
        mostPopularClass,
        mostPopularDay,
        mostPopularTime,
        mostUnavailableDay,
        mostUnavailableTime: "N/A", // Add logic if needed
      });

      setLoading(false);

      // Debug logs para verificar os dados
      console.log("Data from database:", data);
      console.log("Time by day matrix:", matrix);
      console.log("Time blocks:", timeBlocks);
      console.log(
        "Available days calculation example:",
        data[0]?.preferred_days.filter(
          (day) => !data[0]?.unavailable_days.includes(day)
        )
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Resumo Geral */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Resumo Geral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Total de Alunos</p>
              <p className="text-2xl font-bold">{stats?.totalStudents}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Aula Mais Popular</p>
              <p className="text-2xl font-bold">{stats?.mostPopularClass}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Dia Mais Popular</p>
              <p className="text-2xl font-bold">{stats?.mostPopularDay}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Horário Mais Popular</p>
              <p className="text-2xl font-bold">{stats?.mostPopularTime}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Dia Mais Indisponível</p>
              <p className="text-2xl font-bold">{stats?.mostUnavailableDay}</p>
            </div>
          </div>
        </div>

        {/* Gráfico de Primeira Escolha */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Aulas de Primeira Escolha
          </h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={firstChoiceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Escolhas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Distribuição de Escolhas
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aula
                  </th>
                  {[1, 2, 3, 4, 5].map((choice) => (
                    <th
                      key={choice}
                      className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {choice}ª Escolha
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.from(
                  new Set(
                    classChoicesDistribution.flatMap((choice) =>
                      Object.keys(choice.distribution)
                    )
                  )
                ).map((className) => (
                  <tr key={className}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {className}
                    </td>
                    {classChoicesDistribution.map((choice, index) => (
                      <td
                        key={index}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {choice.distribution[className] || 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Matriz de Frequência */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Matriz de Frequência: Horários por Dia
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dia
                  </th>
                  {allTimeBlocks.map((time) => (
                    <th
                      key={time}
                      className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeByDayMatrix.map((row) => (
                  <tr key={row.day}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.day}
                    </td>
                    {allTimeBlocks.map((time) => (
                      <td
                        key={time}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {row[time]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
