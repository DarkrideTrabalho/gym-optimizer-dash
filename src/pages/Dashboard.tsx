import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface PreferenceStats {
  totalStudents: number;
  mostPopularClass: string;
  mostPopularDay: string;
  mostPopularTime: string;
  mostUnavailableDay: string;
  mostUnavailableTime: string;
  topChoices: {
    [key: number]: { name: string; count: number };
  };
}

const Dashboard = () => {
  const [favoriteClassesData, setFavoriteClassesData] = useState([]);
  const [firstChoiceData, setFirstChoiceData] = useState([]);
  const [timeBlocksData, setTimeBlocksData] = useState([]);
  const [unavailableTimeData, setUnavailableTimeData] = useState([]);
  const [unavailableDaysData, setUnavailableDaysData] = useState([]);
  const [classChoicesDistribution, setClassChoicesDistribution] = useState([]);
  const [preferredDaysData, setPreferredDaysData] = useState([]);
  const [stats, setStats] = useState<PreferenceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const disciplineColors = {
    "Ginástica Localizada": "#8B5CF6",
    "Pilates": "#D946EF",
    "Alongamento": "#F97316",
    "Funcional": "#0EA5E9",
    "Dança": "#1EAEDB",
    "Yoga": "#33C3F0",
    "Crossfit": "#0FA0CE",
  };

  const getDisciplineColor = (discipline: string) => {
    return disciplineColors[discipline] || "#9F9EA1";
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("class_preferences")
        .select("*");

      if (error) throw error;

      const totalStudents = data.length;

      const choiceCounts = Array.from({ length: 5 }, (_, i) => {
        const counts: { [key: string]: number } = {};
        data.forEach((preference) => {
          const className = preference[`favorite_class_${i + 1}`];
          if (className) {
            counts[className] = (counts[className] || 0) + 1;
          }
        });
        const topChoice = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];
        return {
          choice: i + 1,
          name: topChoice[0],
          count: topChoice[1]
        };
      });

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

      const firstChoiceCount: { [key: string]: number } = {};
      data.forEach((preference) => {
        const className = preference.favorite_class_1;
        if (className) {
          firstChoiceCount[className] = (firstChoiceCount[className] || 0) + 1;
        }
      });

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
      }

      const daysCount: { [key: string]: number } = {};
      data.forEach((preference) => {
        if (Array.isArray(preference.preferred_days)) {
          preference.preferred_days.forEach((day: string) => {
            daysCount[day] = (daysCount[day] || 0) + 1;
          });
        }
      });

      const timeBlocks: { [key: string]: number } = {};
      data.forEach((preference) => {
        if (Array.isArray(preference.time_blocks)) {
          preference.time_blocks.forEach((block: string) => {
            timeBlocks[block] = (timeBlocks[block] || 0) + 1;
          });
        }
      });

      const unavailableDaysCount: { [key: string]: number } = {};
      const unavailableTimeCount: { [key: string]: number } = {};
      
      data.forEach((preference) => {
        if (Array.isArray(preference.unavailable_days)) {
          preference.unavailable_days.forEach((day: string) => {
            unavailableDaysCount[day] = (unavailableDaysCount[day] || 0) + 1;
          });
        }
        if (Array.isArray(preference.unavailable_time_blocks)) {
          preference.unavailable_time_blocks.forEach((time: string) => {
            unavailableTimeCount[time] = (unavailableTimeCount[time] || 0) + 1;
          });
        }
      });

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

      const unavailableDays = Object.entries(unavailableDaysCount)
        .map(([day, count]) => ({
          day,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      const unavailableTimes = Object.entries(unavailableTimeCount)
        .map(([time, count]) => ({
          time,
          count,
        }))
        .sort((a, b) => b.count - a.count);

      setFavoriteClassesData(favoriteClasses);
      setFirstChoiceData(firstChoiceClasses);
      setTimeBlocksData(timeBlocksArray);
      setClassChoicesDistribution(choicesDistribution);
      setPreferredDaysData(preferredDaysArray);
      
      const topChoices = choiceCounts.reduce((acc, choice) => {
        acc[choice.choice] = {
          name: choice.name,
          count: choice.count
        };
        return acc;
      }, {});

      setStats({
        totalStudents,
        mostPopularClass: Object.entries(classesCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
        mostPopularDay: Object.entries(daysCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
        mostPopularTime: Object.entries(timeBlocks).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
        mostUnavailableDay: Object.entries(unavailableDaysCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
        mostUnavailableTime: "N/A",
        topChoices
      });

      setUnavailableDaysData(unavailableDays);
      setUnavailableTimeData(unavailableTimes);

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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Resumo Geral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Total de Alunos</p>
              <p className="text-2xl font-bold">{stats?.totalStudents}</p>
            </div>
            {[1, 2, 3, 4, 5].map((choice) => (
              <div key={choice} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">{choice}ª Escolha Mais Popular</p>
                <p className="text-2xl font-bold">{stats?.topChoices[choice]?.name}</p>
                <p className="text-sm text-gray-500">
                  {stats?.topChoices[choice]?.count} alunos
                </p>
              </div>
            ))}
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
                  interval={0}
                  tick={{
                    fill: "#403E43",
                    fontSize: 12
                  }}
                />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                  }}
                  cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                />
                <Bar dataKey="count">
                  {firstChoiceData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={getDisciplineColor(entry.name)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {firstChoiceData.map((discipline, index) => (
              <div key={index} className="flex items-center">
                <div
                  className="w-4 h-4 rounded mr-2"
                  style={{ backgroundColor: getDisciplineColor(discipline.name) }}
                />
                <span className="text-sm text-gray-600">{discipline.name}</span>
              </div>
            ))}
          </div>
        </div>

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

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Dias e Horários Preferidos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Dias e Horários Indisponíveis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Dias Indisponíveis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 bg-gray-50">Dia</th>
                      <th className="px-4 py-2 bg-gray-50">Alunos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unavailableDaysData.map((dayData, index) => (
                      <tr
                        key={dayData.day}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-4 py-2">{dayData.day}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            <span className="mr-2">{dayData.count}</span>
                            <div
                              className="h-2 bg-red-500 rounded"
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

            <div>
              <h3 className="text-lg font-medium mb-4">Horários Indisponíveis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 bg-gray-50">Horário</th>
                      <th className="px-4 py-2 bg-gray-50">Alunos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unavailableTimeData.map((timeData, index) => (
                      <tr
                        key={timeData.time}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-4 py-2">{timeData.time}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            <span className="mr-2">{timeData.count}</span>
                            <div
                              className="h-2 bg-red-500 rounded"
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
