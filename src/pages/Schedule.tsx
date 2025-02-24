
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Schedule = () => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);

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
      // Buscar preferências dos alunos
      const { data: preferences, error: preferencesError } = await supabase
        .from("class_preferences")
        .select("*");

      if (preferencesError) {
        throw preferencesError;
      }

      // Chamar a edge function para gerar o horário otimizado
      const { data, error } = await supabase.functions.invoke('generate-optimal-schedule', {
        body: { preferences }
      });

      if (error) {
        throw error;
      }

      setSchedule(data.schedule);
      toast.success("Horário gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar horário:", error);
      toast.error("Erro ao gerar horário. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Geração de Horário</h2>
              <p className="text-gray-600 mt-1">
                O algoritmo considera as preferências dos alunos, disponibilidade dos professores,
                e capacidade das salas para gerar um horário otimizado.
              </p>
            </div>
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
                        const slots = schedule?.[day]?.[time] || [];
                        return (
                          <td
                            key={`${day}-${time}`}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            <div className="space-y-2">
                              {slots.map((slot, index) => (
                                <div 
                                  key={index} 
                                  className="border-l-4 pl-2 rounded-lg bg-gray-50 p-2"
                                  style={{
                                    borderColor: slot.room === 1 ? '#8B5CF6' : '#EC4899'
                                  }}
                                >
                                  <div className="font-medium">{slot.class}</div>
                                  <div className="text-xs text-gray-400">
                                    Sala {slot.room} | {slot.teacher}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Score: {Number(slot.score).toFixed(2)}
                                  </div>
                                </div>
                              ))}
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

          {schedule && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Legenda:</h3>
              <div className="flex gap-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-[#8B5CF6] mr-2"></div>
                  <span className="text-sm text-gray-600">Sala 1</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-[#EC4899] mr-2"></div>
                  <span className="text-sm text-gray-600">Sala 2</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Score: Indica o nível de otimização baseado nas preferências dos alunos.
                Quanto maior o valor, melhor a correspondência com as preferências.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Schedule;
