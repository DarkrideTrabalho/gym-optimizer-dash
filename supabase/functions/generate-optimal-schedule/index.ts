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
  "19:30 - 20:30"
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
    const preferences = requestData.preferences;

    // Calcular pontuação para cada combinação de aula/horário
    const scores: Record<string, Record<string, Record<string, number>>> = {};
    teachers.professor2.classes.concat(teachers.professor3.classes).forEach(className => {
      scores[className] = {};
      days.forEach(day => {
        scores[className][day] = {};
        timeSlots.forEach(time => {
          scores[className][day][time] = 0;
        });
      });
    });

    // Calcular pontuações baseadas nas preferências
    preferences.forEach(pref => {
      const classChoices = [
        pref.favorite_class_1,
        pref.favorite_class_2,
        pref.favorite_class_3,
        pref.favorite_class_4,
        pref.favorite_class_5
      ];

      pref.preferred_days.forEach(day => {
        if (!pref.unavailable_days.includes(day)) {
          pref.time_blocks.forEach(time => {
            classChoices.forEach((className, index) => {
              if (scores[className]?.[day]?.[time] !== undefined) {
                scores[className][day][time] += (5 - index) * 0.2; // Peso maior para primeiras escolhas
              }
            });
          });
        }
      });
    });

    // Alocar aulas baseado nas pontuações
    days.forEach(day => {
      timeSlots.forEach(time => {
        if (optimizedSchedule[day][time].length < 2) { // Máximo 2 aulas por horário
          // Encontrar melhor aula para este horário
          let bestClass = '';
          let bestScore = 0;
          let bestTeacher = '';

          Object.entries(scores).forEach(([className, dayScores]) => {
            const score = dayScores[day][time];
            if (score > bestScore) {
              // Verificar qual professor pode dar esta aula
              const teacher = teachers.professor2.classes.includes(className) 
                ? "Professor 2" 
                : "Professor 3";
              
              bestClass = className;
              bestScore = score;
              bestTeacher = teacher;
            }
          });

          if (bestScore > 0) {
            optimizedSchedule[day][time].push({
              class: bestClass,
              room: optimizedSchedule[day][time].length + 1,
              teacher: bestTeacher,
              score: bestScore
            });
          }
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
