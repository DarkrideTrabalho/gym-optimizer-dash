
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Schedule = () => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSchedule = async () => {
    setLoading(true);
    try {
      const { data: preferences, error: preferencesError } = await supabase
        .from("class_preferences")
        .select("*");

      if (preferencesError) throw preferencesError;

      // Aqui vamos criar um exemplo de horário baseado nas preferências
      const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
      const timeSlots = [
        "10:00 - 11:00",
        "16:00 - 17:00",
        "17:00 - 18:00",
        "18:00 - 19:00",
        "19:00 - 20:00"
      ];

      // Criar uma estrutura de horário exemplo
      const generatedSchedule = days.map(day => ({
        day,
        slots: timeSlots.map(time => ({
          time,
          class: "A ser definido",
          students: 0
        }))
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
            <Button
              onClick={generateSchedule}
              disabled={loading}
            >
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
                      {days.map(day => (
                        <td
                          key={`${day}-${time}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {schedule.find(s => s.day === day)
                            ?.slots.find(s => s.time === time)?.class}
                        </td>
                      ))}
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
