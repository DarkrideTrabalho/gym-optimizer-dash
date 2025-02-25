
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Class {
  name: string;
  duration: number; // em minutos
}

interface Teacher {
  name: string;
  classes: Class[];
  fixedSchedule?: { day: string; time: string }[];
}

// Definição dos professores e suas aulas com duração
const teachers: { [key: string]: Teacher } = {
  professor1: {
    name: "Professor 1",
    classes: [{ name: "Zumba", duration: 60 }],
    fixedSchedule: [
      { day: "Terça", time: "19:00 - 20:00" },
      { day: "Quinta", time: "18:30 - 19:30" }
    ]
  },
  professor2: {
    name: "Professor 2",
    classes: [
      { name: "Core Express", duration: 45 },
      { name: "Hiit", duration: 45 },
      { name: "Tabatta", duration: 45 },
      { name: "Body Upper", duration: 60 },
      { name: "Fit Step", duration: 60 },
      { name: "Fullbody", duration: 60 },
      { name: "GAP", duration: 60 },
      { name: "Localizada", duration: 60 },
      { name: "Mobistretching", duration: 60 },
      { name: "Treino Livre", duration: 60 },
      { name: "Vitta Core legs", duration: 60 }
    ]
  },
  professor3: {
    name: "Professor 3",
    classes: [
      { name: "Pilates", duration: 60 },
      { name: "Power Yoga", duration: 60 },
      { name: "Yoga Flow", duration: 60 }
    ]
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

function calculateClassPopularity(preferences: any[]) {
  const popularity: { [key: string]: number } = {};
  
  preferences.forEach(pref => {
    for (let i = 1; i <= 5; i++) {
      const className = pref[`favorite_class_${i}`];
      popularity[className] = (popularity[className] || 0) + (6 - i); // Peso maior para primeiras escolhas
    }
  });
  
  return popularity;
}

function calculateTimeBlockPopularity(preferences: any[]) {
  const popularity: { [key: string]: number } = {};
  
  preferences.forEach(pref => {
    pref.time_blocks.forEach((time: string) => {
      popularity[time] = (popularity[time] || 0) + 1;
    });
  });
  
  return popularity;
}

function calculateDayPopularity(preferences: any[]) {
  const popularity: { [key: string]: number } = {};
  const unavailability: { [key: string]: number } = {};
  
  preferences.forEach(pref => {
    pref.preferred_days.forEach((day: string) => {
      popularity[day] = (popularity[day] || 0) + 1;
    });
    
    pref.unavailable_days.forEach((day: string) => {
      unavailability[day] = (unavailability[day] || 0) + 1;
    });
  });
  
  return { popularity, unavailability };
}

function isTimeSlotOverlapping(slot1: string, duration1: number, slot2: string, duration2: number) {
  const [start1] = slot1.split(' - ');
  const [start2] = slot2.split(' - ');
  
  const time1 = new Date(`2000-01-01 ${start1}`);
  const time2 = new Date(`2000-01-01 ${start2}`);
  
  const end1 = new Date(time1.getTime() + duration1 * 60000);
  const end2 = new Date(time2.getTime() + duration2 * 60000);
  
  return time1 < end2 && time2 < end1;
}

function calculateClassScore(className: string, time: string, day: string, preferences: any[]) {
  let score = 0;
  let matchCount = 0;
  
  preferences.forEach(pref => {
    // Verificar se o horário está nas preferências
    if (pref.time_blocks.includes(time)) {
      score += 2;
      matchCount++;
    }
    
    // Verificar se o dia está nas preferências
    if (pref.preferred_days.includes(day)) {
      score += 2;
      matchCount++;
    }
    
    // Verificar se o dia está nos dias indisponíveis
    if (pref.unavailable_days.includes(day)) {
      score -= 5;
      matchCount++;
    }
    
    // Verificar ranking da aula nas preferências
    for (let i = 1; i <= 5; i++) {
      if (pref[`favorite_class_${i}`] === className) {
        score += (6 - i);
        matchCount++;
        break;
      }
    }
  });
  
  return matchCount > 0 ? score / matchCount : 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const preferences = requestData.preferences;

    if (!preferences || !Array.isArray(preferences)) {
      throw new Error("Preferências inválidas ou não fornecidas");
    }

    console.log("Analisando preferências dos alunos...");
    
    const classPopularity = calculateClassPopularity(preferences);
    const timeBlockPopularity = calculateTimeBlockPopularity(preferences);
    const dayAnalysis = calculateDayPopularity(preferences);

    console.log("Popularidade das aulas:", classPopularity);
    console.log("Popularidade dos horários:", timeBlockPopularity);
    console.log("Análise dos dias:", dayAnalysis);

    // Inicializar horário vazio
    const optimizedSchedule: Record<string, Record<string, any[]>> = {};
    days.forEach(day => {
      optimizedSchedule[day] = {};
      timeSlots.forEach(time => {
        optimizedSchedule[day][time] = [];
      });
    });

    // 1. Primeiro, alocar horários fixos do Professor 1 (Zumba)
    console.log("Alocando horários fixos de Zumba");
    teachers.professor1.fixedSchedule?.forEach(({ day, time }) => {
      optimizedSchedule[day][time].push({
        class: "Zumba",
        room: 1,
        teacher: "Professor 1",
        score: calculateClassScore("Zumba", time, day, preferences)
      });
    });

    // 2. Alocar outras aulas baseado nas preferências
    console.log("Alocando outras aulas com base nas preferências");
    days.forEach(day => {
      if (dayAnalysis.unavailability[day] > preferences.length / 2) {
        console.log(`Pulando ${day} devido a alta indisponibilidade`);
        return;
      }

      timeSlots.forEach(time => {
        if (optimizedSchedule[day][time].length >= 2) return;

        const currentSlots = optimizedSchedule[day][time];
        const usedTeachers = new Set(currentSlots.map(slot => slot.teacher));

        // Tentar alocar Professor 2 ou 3 baseado nas preferências
        [teachers.professor2, teachers.professor3].forEach(teacher => {
          if (usedTeachers.has(teacher.name)) return;

          // Verificar sobreposição com outras aulas do mesmo professor
          const hasOverlap = timeSlots.some(otherTime => {
            if (time === otherTime) return false;
            return optimizedSchedule[day][otherTime].some(slot => {
              if (slot.teacher !== teacher.name) return false;
              const currentClass = teacher.classes.find(c => c.name === slot.class);
              const duration = currentClass ? currentClass.duration : 60;
              return isTimeSlotOverlapping(time, 60, otherTime, duration);
            });
          });

          if (!hasOverlap) {
            // Escolher a aula mais popular disponível
            const availableClasses = teacher.classes
              .map(classInfo => ({
                ...classInfo,
                popularity: classPopularity[classInfo.name] || 0
              }))
              .sort((a, b) => b.popularity - a.popularity);

            if (availableClasses.length > 0) {
              const selectedClass = availableClasses[0];
              const score = calculateClassScore(selectedClass.name, time, day, preferences);

              if (score > 0) {
                optimizedSchedule[day][time].push({
                  class: selectedClass.name,
                  room: optimizedSchedule[day][time].length + 1,
                  teacher: teacher.name,
                  score
                });
              }
            }
          }
        });
      });
    });

    console.log("Horário gerado com sucesso");

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
