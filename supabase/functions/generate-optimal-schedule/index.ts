
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

    // Função para verificar se um professor está disponível em um horário
    const isTeacherAvailable = (teacher: string, day: string, time: string) => {
      return !optimizedSchedule[day][time].some(slot => slot.teacher === teacher);
    };

    // Função para adicionar uma aula ao horário
    const addClassToSchedule = (day: string, time: string, teacherObj: any, room: number) => {
      const randomClassIndex = Math.floor(Math.random() * teacherObj.classes.length);
      const className = teacherObj.classes[randomClassIndex];
      
      optimizedSchedule[day][time].push({
        class: className,
        room: room,
        teacher: teacherObj.name,
        score: 0.8
      });
    };

    // 1. Primeiro, alocar horários fixos do Professor 1 (Zumba)
    console.log("Alocando horários fixos de Zumba");
    teachers.professor1.fixedSchedule.forEach(({ day, time }) => {
      optimizedSchedule[day][time].push({
        class: "Zumba",
        room: 1,
        teacher: "Professor 1",
        score: 1
      });
    });

    // 2. Depois, alocar outras aulas em todos os horários disponíveis
    console.log("Alocando outras aulas");
    days.forEach(day => {
      timeSlots.forEach(time => {
        // Se já tiver 2 aulas neste horário, pular
        if (optimizedSchedule[day][time].length >= 2) {
          return;
        }

        // Tentar alocar Professor 2
        if (isTeacherAvailable("Professor 2", day, time)) {
          const nextRoom = optimizedSchedule[day][time].length + 1;
          addClassToSchedule(day, time, teachers.professor2, nextRoom);
        }

        // Se ainda houver espaço, tentar alocar Professor 3
        if (optimizedSchedule[day][time].length < 2 && 
            isTeacherAvailable("Professor 3", day, time)) {
          const nextRoom = optimizedSchedule[day][time].length + 1;
          addClassToSchedule(day, time, teachers.professor3, nextRoom);
        }
      });
    });

    console.log("Horário gerado com sucesso");
    console.log("Exemplo de horário gerado:", JSON.stringify(optimizedSchedule["Segunda"], null, 2));

    return new Response(
      JSON.stringify({ 
        schedule: optimizedSchedule,
        message: "Horário gerado com sucesso"
      }),
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
        message: error.message || "Erro interno ao gerar horário",
        details: error.stack
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
