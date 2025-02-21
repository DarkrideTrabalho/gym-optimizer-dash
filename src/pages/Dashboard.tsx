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

interface TimeSlotCount {
  day: string;
  time: string;
  count: number;
}

const Dashboard = () => {
  const [favoriteClassesData, setFavoriteClassesData] = useState([]);
  const [firstChoiceData, setFirstChoiceData] = useState([]);
  const [timeBlocksData, setTimeBlocksData] = useState([]);
  const [classChoicesDistribution, setClassChoicesDistribution] = useState([]);
  const [preferredDaysData, setPreferredDaysData] = useState([]);
  const [stats, setStats] = useState<PreferenceStats | null>(null);
  const [availabilityData, setAvailabilityData] = useState<TimeSlotCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailableDaysData, setUnavailableDaysData] = useState([]);
  const [unavailableTimeData, setUnavailableTimeData] = useState([]);

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
      const allDays = [
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
        "Domingo",
      ];

      // Inicializar todos os dias com 0
      allDays.forEach((day) => {
        daysCount[day] = 0;
      });

      // Contar as preferências corretamente a partir do array preferred_days
      data.forEach((preference) => {
        // Verifica se preferred_days existe e é um array
        if (Array.isArray(preference.preferred_days)) {
          preference.preferred_days.forEach((day: string) => {
            if (allDays.includes(day)) {
              daysCount[day] += 1;
            }
          });
        }
      });

      // Debug log para verificar as contagens
      console.log("Contagem de dias preferidos:", daysCount);

      // Transformar em array para o gráfico
      const preferredDaysArray = allDays.map((day) => ({
        day,
        count: daysCount[day],
      }));

      // Debug log para verificar o array final
      console.log("Array de dias preferidos:", preferredDaysArray);

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
        const availableDays = preference.preferred_days.filter(
          (day) => !preference.unavailable_days.includes(day)
        );

        availableDays.forEach((day) => {
          preference.time_blocks.forEach((time) => {
            if (timeByDay[day]) {
              timeByDay[day][time] = (timeByDay[day][time] || 0) + 1;
            }
          });
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
      const mostUnavailableDay = Object.entries(daysCount).sort(
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
        mostUnavailableTime: "N/A", // Add logic if needed
      });

      const processAvailabilityData = (data) => {
        const availability: TimeSlotCount[] = [];

        data.forEach((student) => {
          const availableDays = student.preferred_days.filter(
            (day) => !student.unavailable_days.includes(day)
          );

          availableDays.forEach((day) => {
            student.time_blocks.forEach((time) => {
              const existingSlot = availability.find(
                (slot) => slot.day === day && slot.time === time
              );

              if (existingSlot) {
                existingSlot.count += 1;
              } else {
                availability.push({ day, time, count: 1 });
              }
            });
          });
        });

        // Ordenar por contagem para melhor visualização
        return availability.sort((a, b) => b.count - a.count);
      };

      // Atualize o estado com os novos dados
      const availability = processAvailabilityData(data);
      setAvailabilityData(availability);

      // Process unavailable days and times
      const unavailableDaysCount: { [key: string]: number } = {};
      const unavailableTimeCount: { [key: string]: number } = {};

      // Inicializar contadores
      allDays.forEach((day) => {
        unavailableDaysCount[day] = 0;
      });
      allTimeBlocks.forEach((time) => {
        unavailableTimeCount[time] = 0;
      });

      // Contar indisponibilidades
      data.forEach((preference) => {
        if (Array.isArray(preference.unavailable_days)) {
          preference.unavailable_days.forEach((day: string) => {
            if (allDays.includes(day)) {
              unavailableDaysCount[day] += 1;
            }
          });
        }
        if (Array.isArray(preference.unavailable_time_blocks)) {
          preference.unavailable_time_blocks.forEach((time: string) => {
            if (allTimeBlocks.includes(time)) {
              unavailableTimeCount[time] += 1;
            }
          });
        }
      });

      // Transformar em arrays para os gráficos
      const unavailableDaysArray = allDays.map((day) => ({
        day,
        count: unavailableDaysCount[day],
      }));

      const unavailableTimeArray = allTimeBlocks.map((time) => ({
        time,
        count: unavailableTimeCount[time],
      }));

      setUnavailableDaysData(unavailableDaysArray);
      setUnavailableTimeData(unavailableTimeArray);

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
                <Bar
                  dataKey="count"
                  fill={(entry) => {
                    const colors = {
                      Yoga: "#FF6B6B",
                      Pilates: "#4ECDC4",
                      Funcional: "#45B7D1",
                      Dança: "#96CEB4",
                      Musculação: "#FFEEAD",
                      Crossfit: "#D4A5A5",
                      Spinning: "#9B59B6",
                      Zumba: "#FFB347",
                    };
                    return colors[entry.name] || "#4f46e5";
                  }}
                />
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
                    {preferredDaysData
                      .filter((item) =>
                        [
                          "Segunda",
                          "Terça",
                          "Quarta",
                          "Quinta",
                          "Sexta",
                          "Sábado",
                        ].includes(item.day)
                      )
                      .map((dayData, index) => (
                        <tr
                          key={dayData.day}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
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

        {/* Dias e Horários Indisponíveis */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Dias e Horários Indisponíveis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dias Indisponíveis */}
            <div>
              <h3 className="text-lg font-medium mb-4">Dias Indisponíveis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 bg-gray-50">Dia</th>
                      <th className="px-4 py-2 bg-gray-50">Alunos</th>
                      <th className="px-4 py-2 bg-gray-50">Porcentagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unavailableDaysData.map((dayData) => {
                      const percentage = stats?.totalStudents
                        ? ((dayData.count / stats.totalStudents) * 100).toFixed(
                            1
                          )
                        : "0";

                      return (
                        <tr key={dayData.day} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{dayData.day}</td>
                          <td className="px-4 py-2">{dayData.count}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center">
                              <span className="mr-2">{percentage}%</span>
                              <div
                                className="h-2 bg-red-500 rounded"
                                style={{
                                  width: `${percentage}%`,
                                  maxWidth: "100px",
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Horários Indisponíveis */}
            <div>
              <h3 className="text-lg font-medium mb-4">
                Horários Indisponíveis
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 bg-gray-50">Horário</th>
                      <th className="px-4 py-2 bg-gray-50">Alunos</th>
                      <th className="px-4 py-2 bg-gray-50">Porcentagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unavailableTimeData.map((timeData) => {
                      const percentage = stats?.totalStudents
                        ? (
                            (timeData.count / stats.totalStudents) *
                            100
                          ).toFixed(1)
                        : "0";

                      return (
                        <tr key={timeData.time} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{timeData.time}</td>
                          <td className="px-4 py-2">{timeData.count}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center">
                              <span className="mr-2">{percentage}%</span>
                              <div
                                className="h-2 bg-red-500 rounded"
                                style={{
                                  width: `${percentage}%`,
                                  maxWidth: "100px",
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
