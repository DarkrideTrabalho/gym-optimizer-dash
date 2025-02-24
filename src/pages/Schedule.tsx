import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Schedule = () => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
  const timeSlots = [
    "10:00 - 11:00",
    "16:00 - 17:00",
    "17:00 - 18:00",
    "18:00 - 19:00",
    "19:00 - 20:00",
  ];

  const generateSchedule = async () => {
    navigate('/');
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
                                <div key={index} className="border-l-4 pl-2" style={{
                                  borderColor: slot.room === 1 ? '#8B5CF6' : '#EC4899'
                                }}>
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
        </div>
      </div>
    </div>
  );
};

export default Schedule;
