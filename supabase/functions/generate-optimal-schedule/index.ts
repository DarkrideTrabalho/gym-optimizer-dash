
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Definição dos professores e suas aulas
const teachers = {
  professor1: {
    name: "Professor 1",
    classes: ["Zumba"],
    fixedSchedule: [
      { day: "Terça", time: "19:00 - 20:00" },
      { day: "Quinta", time: "18:00 - 19:00" }
    ]
  },
  professor2: {
    name: "Professor 2",
    classes: [
      "Body Upper", "Core Express", "Fit Step", "Fullbody", "GAP",
      "Hiit", "Localizada", "Mobistretching", "Treino Livre",
      "Tabatta", "Vitta Core legs"
    ]
  },
  professor3: {
    name: "Professor 3",
    classes: ["Pilates", "Yoga Flow", "Power Yoga"]
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences } = await req.json();

    // Converta os dados do Supabase para um formato mais fácil de processar
    const processedPreferences = preferences.reduce((acc, pref) => {
      pref.time_blocks.forEach(time => {
        if (!acc[time]) acc[time] = { classes: {} };
        
        [
          pref.favorite_class_1,
          pref.favorite_class_2,
          pref.favorite_class_3,
          pref.favorite_class_4,
          pref.favorite_class_5
        ].forEach((className, index) => {
          if (className) {
            if (!acc[time].classes[className]) {
              acc[time].classes[className] = 0;
            }
            // Peso maior para primeiras escolhas
            acc[time].classes[className] += 1 / (index + 1);
          }
        });
      });
      return acc;
    }, {});

    // Função para verificar se um horário está disponível em uma sala
    const isTimeSlotAvailable = (
      schedule,
      day,
      time,
      room
    ) => {
      return !schedule[day]?.[time]?.some(slot => slot.room === room);
    };

    // Função para encontrar o professor disponível para uma aula
    const findAvailableTeacher = (className) => {
      if (teachers.professor1.classes.includes(className)) return teachers.professor1;
      if (teachers.professor2.classes.includes(className)) return teachers.professor2;
      return teachers.professor3;
    };

    // Gerar horário otimizado
    const optimizedSchedule = {};
    const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
    const timeSlots = [
      "10:00 - 11:00",
      "16:00 - 17:00",
      "17:00 - 18:00",
      "18:00 - 19:00",
      "19:00 - 20:00",
    ];

    // Inicializar estrutura do horário
    days.forEach(day => {
      optimizedSchedule[day] = {};
      timeSlots.forEach(time => {
        optimizedSchedule[day][time] = [];
      });
    });

    // Primeiro, alocar horários fixos do Professor 1 (Zumba)
    teachers.professor1.fixedSchedule.forEach(({ day, time }) => {
      optimizedSchedule[day][time].push({
        class: "Zumba",
        room: 1,
        teacher: "Professor 1",
        score: processedPreferences[time]?.classes["Zumba"] || 0
      });
    });

    // Depois, alocar as demais aulas baseado nas preferências
    days.forEach(day => {
      timeSlots.forEach(time => {
        // Pular se já tiver 2 aulas neste horário
        if (optimizedSchedule[day][time].length >= 2) return;

        // Ordenar aulas por preferência neste horário
        const timePreferences = processedPreferences[time]?.classes || {};
        const sortedClasses = Object.entries(timePreferences)
          .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

        // Tentar alocar aulas mais populares
        for (const [className, score] of sortedClasses) {
          // Pular se já atingiu limite de salas
          if (optimizedSchedule[day][time].length >= 2) break;

          // Encontrar professor disponível
          const teacher = findAvailableTeacher(className);
          if (!teacher) continue;

          // Verificar se o professor já está alocado neste horário
          const teacherBusy = optimizedSchedule[day][time].some(
            slot => slot.teacher === teacher.name
          );
          if (teacherBusy) continue;

          // Encontrar sala disponível
          for (let room = 1; room <= 2; room++) {
            if (isTimeSlotAvailable(optimizedSchedule, day, time, room)) {
              optimizedSchedule[day][time].push({
                class: className,
                room,
                teacher: teacher.name,
                score
              });
              break;
            }
          }
        }
      });
    });

    return new Response(
      JSON.stringify({ schedule: optimizedSchedule }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
