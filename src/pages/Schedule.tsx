
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Schedule = () => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);

  // Definir as constantes no escopo do componente
  const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
  const timeSlots = [
    "10:00 - 11:00",
    "16:00 - 17:00",
    "17:00 - 18:00",
    "18:00 - 19:00",
    "19:00 - 20:00",
  ];

  const generateSchedule = async () => {
    setLoading(true);
    try {
      const { data: preferences, error: preferencesError } = await supabase
        .from("class_preferences")
        .select("*");

      if (preferencesError) throw preferencesError;

      // Processamento das preferências para criar horário
      const availability = {};
      days.forEach(day => {
        availability[day] = {};
        timeSlots.forEach(time => {
          availability[day][time] = {
            studentCount: 0,
            preferredClasses: {}
          };
        });
      });

      // Calcular disponibilidade
      preferences.forEach(preference => {
        const availableDays = preference.preferred_days.filter(
          day => !preference.unavailable_days.includes(day)
        );

        availableDays.forEach(day => {
          if (days.includes(day)) {
            preference.time_blocks.forEach(time => {
              if (timeSlots.includes(time)) {
                availability[day][time].studentCount++;
                [
                  preference.favorite_class_1,
                  preference.favorite_class_2,
                  preference.favorite_class_3,
                  preference.favorite_class_4,
                  preference.favorite_class_5
                ].forEach(className => {
                  if (className) {
                    availability[day][time].preferredClasses[className] = 
                      (availability[day][time].preferredClasses[className] || 0) + 1;
                  }
                });
              }
            });
          }
        });
      });

      // Criar horário com base nas preferências
      const generatedSchedule = days.map(day => ({
        day,
        slots: timeSlots.map(time => {
          const slot = availability[day][time];
          const mostPreferredClass = Object.entries(slot.preferredClasses)
            .sort((a, b) => b[1] - a[1])[0];
          
          return {
            time,
            class: mostPreferredClass ? mostPreferredClass[0] : "A ser definido",
            students: slot.studentCount
          };
        })
      }));

      setSchedule(generatedSchedule);
      toast.success("Horário gerado com sucesso!");
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast.error("Erro ao gerar horário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Geração de Horário</h2>
            <Button onClick={generateSchedule} disabled={loading}>
              {loading ? "Gerando..." : "Gerar Horário"}
            </Button>
          </div>

          {schedule && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horário
                    </th>
                    {days.map(day => (
                      <th
                        key={day}
                        className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timeSlots.map(time => (
                    <tr key={time}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {time}
                      </td>
                      {days.map(day => {
                        const slot = schedule
                          .find(s => s.day === day)
                          ?.slots.find(s => s.time === time);
                        return (
                          <td
                            key={`${day}-${time}`}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            <div>
                              <div className="font-medium">{slot?.class}</div>
                              <div className="text-xs text-gray-400">
                                {slot?.students} alunos disponíveis
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Schedule;
