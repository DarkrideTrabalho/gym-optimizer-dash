
// deno-lint-ignore-file no-explicit-any
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

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
const timeSlots = [
  "10:00 - 11:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
  "18:00 - 19:00",
  "19:00 - 20:00",
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando geração de horário");

    // Inicializar horário vazio
    const optimizedSchedule: Record<string, Record<string, any[]>> = {};
    days.forEach(day => {
      optimizedSchedule[day] = {};
      timeSlots.forEach(time => {
        optimizedSchedule[day][time] = [];
      });
    });

    // Alocar horários fixos do Professor 1 (Zumba)
    teachers.professor1.fixedSchedule.forEach(({ day, time }) => {
      optimizedSchedule[day][time].push({
        class: "Zumba",
        room: 1,
        teacher: "Professor 1",
        score: 1
      });
    });

    // Alocar aulas para os demais horários
    days.forEach(day => {
      timeSlots.forEach(time => {
        // Pular se já tiver duas aulas neste horário
        if (optimizedSchedule[day][time].length >= 2) return;

        // Lista de professores disponíveis neste horário
        const availableTeachers = [teachers.professor2, teachers.professor3].filter(teacher => {
          // Verificar se o professor já está dando aula neste horário
          return !optimizedSchedule[day][time].some(slot => slot.teacher === teacher.name);
        });

        // Para cada sala disponível, tentar alocar uma aula
        while (optimizedSchedule[day][time].length < 2 && availableTeachers.length > 0) {
          // Escolher um professor aleatório entre os disponíveis
          const teacherIndex = Math.floor(Math.random() * availableTeachers.length);
          const teacher = availableTeachers[teacherIndex];

          // Escolher uma aula aleatória do professor
          const availableClass = teacher.classes[Math.floor(Math.random() * teacher.classes.length)];

          // Adicionar a aula ao horário
          optimizedSchedule[day][time].push({
            class: availableClass,
            room: optimizedSchedule[day][time].length + 1,
            teacher: teacher.name,
            score: 0.8 // Score padrão para teste
          });

          // Remover o professor da lista de disponíveis
          availableTeachers.splice(teacherIndex, 1);
        }
      });
    });

    console.log("Horário gerado com sucesso");

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
    console.error("Erro ao gerar horário:", error);
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message || "Erro interno ao gerar horário"
      }),
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
