
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, RefreshCw } from "lucide-react";

const Schedule = () => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usedEdgeFunction, setUsedEdgeFunction] = useState(true);

  const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
  const timeSlots = [
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

  // Lista de aulas e professores predefinidos para usar como fallback
  const fallbackClasses = {
    "Zumba": "Professor 1",
    "Body Upper": "Professor 2",
    "Core Express": "Professor 2",
    "Fit Step": "Professor 2",
    "Fullbody": "Professor 2",
    "GAP": "Professor 2",
    "Hiit": "Professor 2",
    "Localizada": "Professor 2",
    "Mobistretching": "Professor 2",
    "Treino Livre": "Professor 2",
    "Tabatta": "Professor 2",
    "Vitta Core legs": "Professor 2",
    "Pilates": "Professor 3",
    "Power Yoga": "Professor 3",
    "Yoga Flow": "Professor 3"
  };

  const generateBasicSchedule = (preferences) => {
    try {
      console.log("Gerando horário básico com dados locais");
      
      // Criar um horário básico
      const scheduleTemplate = {};
      days.forEach(day => {
        scheduleTemplate[day] = {};
        timeSlots.forEach(slot => {
          scheduleTemplate[day][slot] = [];
        });
      });

      // Adicionar aulas fixas do Professor 1 (Zumba)
      scheduleTemplate["Terça"]["19:00 - 20:00"] = [{
        class: "Zumba",
        teacher: "Professor 1",
        room: 1,
        score: 1.0
      }];
      
      scheduleTemplate["Quinta"]["18:30 - 19:30"] = [{
        class: "Zumba",
        teacher: "Professor 1",
        room: 1,
        score: 1.0
      }];

      // Distribuir outras aulas com base nas preferências
      const classPopularity = {};
      const classesAssigned = new Set(["Zumba"]);
      
      // Calcular popularidade das aulas
      preferences.forEach(pref => {
        [pref.favorite_class_1, pref.favorite_class_2, pref.favorite_class_3, 
         pref.favorite_class_4, pref.favorite_class_5].forEach(cls => {
          if (cls && cls !== "Zumba") {
            classPopularity[cls] = (classPopularity[cls] || 0) + 1;
          }
        });
      });
      
      // Ordenar aulas por popularidade
      const sortedClasses = Object.keys(classPopularity).sort((a, b) => 
        classPopularity[b] - classPopularity[a]
      );
      
      // Determinar dias e horários mais populares
      const dayPopularity = {};
      const timePopularity = {};
      
      preferences.forEach(pref => {
        (pref.preferred_days || []).forEach(day => {
          dayPopularity[day] = (dayPopularity[day] || 0) + 1;
        });
        
        (pref.time_blocks || []).forEach(time => {
          timePopularity[time] = (timePopularity[time] || 0) + 1;
        });
      });

      // Distribuir aulas do Professor 2 e 3
      // Primeiro, distribuir as aulas mais populares
      for (const className of sortedClasses) {
        if (!classesAssigned.has(className)) {
          const professor = fallbackClasses[className];
          if (!professor) continue;
          
          // Encontrar o melhor slot para esta aula
          let bestScore = -1;
          let bestDay = null;
          let bestTime = null;
          let bestRoom = null;
          
          for (const day of days) {
            // Pular dias com aulas fixas de Zumba para Professor 2 (se for uma aula do Professor 2)
            if (professor === "Professor 2" && 
                ((day === "Terça" && className !== "Zumba") || 
                 (day === "Quinta" && className !== "Zumba"))) {
              continue;
            }
            
            for (const timeSlot of timeSlots) {
              // Verificar se este slot já está ocupado por este professor
              let slotOccupied = false;
              for (const room of [1, 2]) {
                if (scheduleTemplate[day][timeSlot].some(
                  slot => slot.teacher === professor)) {
                  slotOccupied = true;
                  break;
                }
              }
              
              if (slotOccupied) continue;
              
              // Calcular pontuação para este slot
              const dayScore = dayPopularity[day] || 0;
              const timeScore = timePopularity[timeSlot] || 0;
              const totalScore = dayScore + timeScore;
              
              if (totalScore > bestScore) {
                // Verificar qual sala está disponível
                let availableRoom = null;
                if (!scheduleTemplate[day][timeSlot].some(slot => slot.room === 1)) {
                  availableRoom = 1;
                } else if (!scheduleTemplate[day][timeSlot].some(slot => slot.room === 2)) {
                  availableRoom = 2;
                }
                
                if (availableRoom) {
                  bestScore = totalScore;
                  bestDay = day;
                  bestTime = timeSlot;
                  bestRoom = availableRoom;
                }
              }
            }
          }
          
          if (bestDay && bestTime && bestRoom) {
            scheduleTemplate[bestDay][bestTime].push({
              class: className,
              teacher: professor,
              room: bestRoom,
              score: (bestScore / 10).toFixed(2) // Normalizar pontuação
            });
            
            classesAssigned.add(className);
          }
        }
      }
      
      return scheduleTemplate;
    } catch (error) {
      console.error("Erro ao gerar horário básico:", error);
      throw error;
    }
  };

  const generateSchedule = async () => {
    setLoading(true);
    setError(null);
    setUsedEdgeFunction(true);
    
    try {
      console.log("Iniciando geração de horário com IA");

      // Buscar preferências dos alunos
      const { data: preferences, error: preferencesError } = await supabase
        .from("class_preferences")
        .select("*");

      console.log("Preferências:", preferences);
      
      if (preferencesError) {
        console.error("Erro ao buscar preferências:", preferencesError);
        throw preferencesError;
      }

      if (!preferences || preferences.length === 0) {
        console.error("Nenhuma preferência encontrada");
        throw new Error("Nenhuma preferência encontrada");
      }

      // Chamar a edge function para geração com IA
      console.log("Chamando edge function com dados:", { preferences });

      try {
        const { data, error } = await supabase.functions.invoke(
          "generate-optimal-schedule",
          {
            body: { preferences },
          }
        );

        console.log("Resposta da edge function:", data);
        
        if (error) {
          console.error("Erro da edge function:", error);
          throw error;
        }

        if (!data || !data.schedule) {
          console.error("Resposta inválida da edge function");
          throw new Error("Resposta inválida da edge function");
        }
        
        setSchedule(data.schedule);
        setUsedEdgeFunction(true);
        toast.success("Horário gerado com sucesso pela IA!");
      } catch (edgeFunctionError) {
        console.error("Erro ao chamar edge function:", edgeFunctionError);
        
        // Tentar novamente a edge function em caso de falha
        toast.error("Erro na primeira tentativa. Tentando novamente...");
        
        try {
          const { data: retryData, error: retryError } = await supabase.functions.invoke(
            "generate-optimal-schedule",
            {
              body: { preferences },
            }
          );
          
          if (retryError || !retryData || !retryData.schedule) {
            throw new Error("Falha na segunda tentativa");
          }
          
          setSchedule(retryData.schedule);
          setUsedEdgeFunction(true);
          toast.success("Horário gerado com sucesso na segunda tentativa!");
        } catch (retryError) {
          console.error("Erro na segunda tentativa:", retryError);
          throw new Error("Não foi possível gerar o horário com a IA após múltiplas tentativas");
        }
      }
    } catch (error) {
      console.error("Erro completo:", error);
      setError("Erro ao gerar horário com IA. Por favor, tente novamente.");
      toast.error("Erro ao gerar horário com IA. Por favor, tente novamente.");
      setUsedEdgeFunction(false);
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
                O algoritmo considera as preferências dos alunos,
                disponibilidade dos professores, e capacidade das salas para
                gerar um horário otimizado.
              </p>
            </div>
            <Button 
              onClick={generateSchedule} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                "Gerar Horário com IA"
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {schedule && (
            <>
              {!usedEdgeFunction && (
                <Alert className="mb-6 border-amber-300 bg-amber-50">
                  <InfoIcon className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-amber-800">Aviso</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    O horário foi gerado usando o método básico, sem o uso completo da IA.
                    Tente novamente para melhor otimização.
                  </AlertDescription>
                </Alert>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Horário
                      </th>
                      {days.map((day) => (
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
                    {timeSlots.map((time) => (
                      <tr key={time}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {time}
                        </td>
                        {days.map((day) => {
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
                                      borderColor:
                                        slot.room === 1 ? "#8B5CF6" : "#EC4899",
                                    }}
                                  >
                                    <div className="font-medium">
                                      {slot.class}
                                    </div>
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
            </>
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
                Score: Indica o nível de otimização baseado nas preferências dos
                alunos. Quanto maior o valor, melhor a correspondência com as
                preferências.
              </p>
              {usedEdgeFunction && (
                <p className="text-sm text-emerald-600 mt-2 font-medium">
                  Este horário foi gerado usando o algoritmo de IA otimizado para máxima eficiência.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Schedule;
