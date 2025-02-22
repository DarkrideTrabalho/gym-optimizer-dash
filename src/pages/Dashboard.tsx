
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
  const [loading, setLoading] = useState(true);

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
          if (className) {
            classesCount[className] = (classesCount[className] || 0) + 1;
          }
        });
      });

      // Process first choice data
      const firstChoiceCount: { [key: string]: number } = {};
      data.forEach((preference) => {
        const className = preference.favorite_class_1;
        if (className) {
          firstChoiceCount[className] = (firstChoiceCount[className] || 0) + 1;
        }
      });

      // Process class choices distribution
      const choicesDistribution = [];
      for (let i = 1; i <= 5; i++) {
        const choiceCount: { [key: string]: number } = {};
        data.forEach((preference) => {
          const className = preference[`favorite_class_${i}`];
          if (className) {
            choiceCount[className] = (choiceCount[className] || 0) + 1;
          }
        });
        choicesDistribution.push({
          choice: i,
          distribution: choiceCount,
        });
      });

      // Process preferred days data
      const daysCount: { [key: string]: number } = {};
      data.forEach((preference) => {
        if (Array.isArray(preference.preferred_days)) {
          preference.preferred_days.forEach((day: string) => {
            daysCount[day] = (daysCount[day] || 0) + 1;
          });
        }
      });

      // Process time blocks data
      const timeBlocks: { [key: string]: number } = {};
      data.forEach((preference) => {
        if (Array.isArray(preference.time_blocks)) {
          preference.time_blocks.forEach((block: string) => {
            timeBlocks[block] = (timeBlocks[block] || 0) + 1;
          });
        }
      });

      // Process unavailable days
      const unavailableDaysCount: { [key: string]: number } = {};
      data.forEach((preference) => {
        if (Array.isArray(preference.unavailable_days)) {
          preference.unavailable_days.forEach((day: string) => {
            unavailableDaysCount[day] = (unavailableDaysCount[day] || 0) + 1;
          });
        }
      });

      // Calculate most popular/unavailable stats
      const mostPopularClass = Object.entries(classesCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
      const mostPopularDay = Object.entries(daysCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
      const mostPopularTime = Object.entries(timeBlocks).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
      const mostUnavailableDay = Object.entries(unavailableDaysCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

      // Transform data for charts
      const favoriteClasses = Object.entries(classesCount)
        .map(([name, count]) => ({
          name,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      const firstChoiceClasses = Object.entries(firstChoiceCount)
        .map(([name, count]) => ({
          name,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      const timeBlocksArray = Object.entries(timeBlocks)
        .map(([time, count]) => ({
          time,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      const preferredDaysArray = Object.entries(daysCount)
        .map(([day, count]) => ({
          day,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      // Update state
      setFavoriteClassesData(favoriteClasses);
      setFirstChoiceData(firstChoiceClasses);
      setTimeBlocksData(timeBlocksArray);
      setClassChoicesDistribution(choicesDistribution);
      setPreferredDaysData(preferredDaysArray);
      setStats({
        totalStudents,
        mostPopularClass,
        mostPopularDay,
        mostPopularTime,
        mostUnavailableDay,
        mostUnavailableTime: "N/A",
      });

      // Debug logs
      console.log("Data from database:", data);
      console.log("Time blocks:", timeBlocks);
      console.log("Preferred days:", daysCount);
      console.log("Favorite classes:", classesCount);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar os dados");
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

        {/* Dias e Horários Preferidos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Dias e Horários Preferidos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dias Preferidos */}
            <div>
              <h3 className="text-lg font-medium mb-4">Dias Preferidos</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 bg-gray-50">Dia</th>
                      <th className="px-4 py-2 bg-gray-50">Alunos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preferredDaysData.map((dayData, index) => (
                      <tr
                        key={dayData.day}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-4 py-2">{dayData.day}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            <span className="mr-2">{dayData.count}</span>
                            <div
                              className="h-2 bg-indigo-500 rounded"
                              style={{
                                width: `${
                                  (dayData.count / stats?.totalStudents) * 100
                                }%`,
                                maxWidth: "200px",
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Horários Preferidos */}
            <div>
              <h3 className="text-lg font-medium mb-4">Horários Preferidos</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 bg-gray-50">Horário</th>
                      <th className="px-4 py-2 bg-gray-50">Alunos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeBlocksData.map((timeData, index) => (
                      <tr
                        key={timeData.time}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-4 py-2">{timeData.time}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            <span className="mr-2">{timeData.count}</span>
                            <div
                              className="h-2 bg-indigo-500 rounded"
                              style={{
                                width: `${
                                  (timeData.count / stats?.totalStudents) * 100
                                }%`,
                                maxWidth: "200px",
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
