
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando processamento da requisição");

    const requestData = await req.json();
    console.log("Dados recebidos:", JSON.stringify(requestData, null, 2));

    if (!requestData.preferences || !Array.isArray(requestData.preferences)) {
      throw new Error("Preferências inválidas ou não fornecidas");
    }

    // Inicializar horário vazio
    const optimizedSchedule: Record<string, Record<string, any[]>> = {};
    days.forEach(day => {
      optimizedSchedule[day] = {};
      timeSlots.forEach(time => {
        optimizedSchedule[day][time] = [];
      });
    });

    // Primeiro, alocar horários fixos do Professor 1 (Zumba)
    console.log("Alocando horários fixos do Professor 1");
    teachers.professor1.fixedSchedule.forEach(({ day, time }) => {
      if (optimizedSchedule[day] && optimizedSchedule[day][time]) {
        optimizedSchedule[day][time].push({
          class: "Zumba",
          room: 1,
          teacher: "Professor 1",
          score: 1
        });
      }
    });

    // Processar preferências para outros horários
    console.log("Processando preferências para outros horários");
    days.forEach(day => {
      timeSlots.forEach(time => {
        if (optimizedSchedule[day][time].length >= 2) return; // Já tem 2 aulas neste horário

        // Tentar alocar aulas do Professor 2
        if (optimizedSchedule[day][time].length < 2) {
          const availableClass = teachers.professor2.classes[
            Math.floor(Math.random() * teachers.professor2.classes.length)
          ];
          optimizedSchedule[day][time].push({
            class: availableClass,
            room: optimizedSchedule[day][time].length + 1,
            teacher: "Professor 2",
            score: 0.8
          });
        }

        // Tentar alocar aulas do Professor 3
        if (optimizedSchedule[day][time].length < 2) {
          const availableClass = teachers.professor3.classes[
            Math.floor(Math.random() * teachers.professor3.classes.length)
          ];
          optimizedSchedule[day][time].push({
            class: availableClass,
            room: optimizedSchedule[day][time].length + 1,
            teacher: "Professor 3",
            score: 0.7
          });
        }
      });
    });

    console.log("Horário gerado com sucesso");
    console.log(JSON.stringify(optimizedSchedule, null, 2));

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
    console.error("Erro ao processar requisição:", error);
    
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message || "Erro interno ao gerar horário",
        details: error.stack || "Sem detalhes adicionais"
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
