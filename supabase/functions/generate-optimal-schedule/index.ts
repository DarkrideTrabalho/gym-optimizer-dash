
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

// Função para calcular a popularidade das aulas
function calculateClassPopularity(preferences: any[]) {
  const popularity: { [key: string]: number } = {};
  
  preferences.forEach(pref => {
    for (let i = 1; i <= 5; i++) {
      const className = pref[`favorite_class_${i}`];
      popularity[className] = (popularity[className] || 0) + (6 - i); // Peso maior para primeiras escolhas
    }
  });
  
  console.log("Favorite classes:", popularity);
  return popularity;
}

// Função para calcular a popularidade dos blocos de horário
function calculateTimeBlockPopularity(preferences: any[]) {
  const popularity: { [key: string]: number } = {};
  
  preferences.forEach(pref => {
    pref.time_blocks.forEach((time: string) => {
      popularity[time] = (popularity[time] || 0) + 1;
    });
  });
  
  console.log("Time blocks:", popularity);
  return popularity;
}

// Função para calcular a popularidade dos dias
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
  
  console.log("Preferred days:", popularity);
  console.log("Unavailable days:", unavailability);
  return { popularity, unavailability };
}

// Função para verificar se dois horários se sobrepõem
function isTimeSlotOverlapping(slot1: string, duration1: number, slot2: string, duration2: number) {
  const [start1] = slot1.split(' - ');
  const [start2] = slot2.split(' - ');
  
  const time1 = new Date(`2000-01-01 ${start1}`);
  const time2 = new Date(`2000-01-01 ${start2}`);
  
  const end1 = new Date(time1.getTime() + duration1 * 60000);
  const end2 = new Date(time2.getTime() + duration2 * 60000);
  
  return time1 < end2 && time2 < end1;
}

// Função para calcular a pontuação de uma aula com base nas preferências
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

// Função principal que responde às requisições HTTP
serve(async (req) => {
  // Tratamento de CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Iniciando geração de horário otimizado com IA");
    const requestData = await req.json();
    const preferences = requestData.preferences;

    if (!preferences || !Array.isArray(preferences)) {
      throw new Error("Preferências inválidas ou não fornecidas");
    }

    console.log(`Analisando preferências de ${preferences.length} alunos...`);
    
    // Analisar preferências dos alunos
    const classPopularity = calculateClassPopularity(preferences);
    const timeBlockPopularity = calculateTimeBlockPopularity(preferences);
    const dayAnalysis = calculateDayPopularity(preferences);

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

    // 2. Para os dias com alta demanda, priorizar aulas populares
    console.log("Alocando aulas baseado em análise de popularidade");
    
    // Ordenar dias por popularidade
    const sortedDays = [...days].sort((a, b) => 
      (dayAnalysis.popularity[b] || 0) - (dayAnalysis.popularity[a] || 0)
    );
    
    // Ordenar horários por popularidade
    const sortedTimeSlots = [...timeSlots].sort((a, b) =>
      (timeBlockPopularity[b] || 0) - (timeBlockPopularity[a] || 0)
    );
    
    // Ordenar classes por popularidade
    const sortedClasses = Object.entries(classPopularity)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([className]) => className);
    
    console.log("Dias ordenados por popularidade:", sortedDays);
    console.log("Horários ordenados por popularidade:", sortedTimeSlots);
    console.log("Aulas ordenadas por popularidade:", sortedClasses);

    // Manter registro de professores já alocados em cada horário/dia
    const allocatedTeachers: Record<string, Record<string, string[]>> = {};
    days.forEach(day => {
      allocatedTeachers[day] = {};
      timeSlots.forEach(time => {
        allocatedTeachers[day][time] = [];
      });
    });

    // Marcar Professor 1 como alocado nos horários fixos
    teachers.professor1.fixedSchedule?.forEach(({ day, time }) => {
      allocatedTeachers[day][time].push("Professor 1");
    });

    // Distribuir aulas populares nos horários e dias populares
    for (const className of sortedClasses) {
      // Pular Zumba que já foi alocada
      if (className === "Zumba") continue;
      
      // Encontrar o professor para esta aula
      let teacherForClass: string | null = null;
      let classDuration = 60; // Default
      
      for (const [teacherId, teacher] of Object.entries(teachers)) {
        const foundClass = teacher.classes.find(c => c.name === className);
        if (foundClass) {
          teacherForClass = teacher.name;
          classDuration = foundClass.duration;
          break;
        }
      }
      
      if (!teacherForClass) continue;
      
      // Tenta alocar a aula em dias e horários populares
      let allocated = false;
      
      for (const day of sortedDays) {
        if (allocated) break;
        
        // Pular dias com alta indisponibilidade
        if (dayAnalysis.unavailability[day] > preferences.length / 3) {
          console.log(`Pulando ${day} devido a alta indisponibilidade`);
          continue;
        }
        
        for (const time of sortedTimeSlots) {
          if (allocated) break;
          
          // Verificar se o professor já está alocado neste horário
          if (allocatedTeachers[day][time].includes(teacherForClass)) {
            continue;
          }
          
          // Verificar se há sobreposição com aulas existentes do mesmo professor
          let hasOverlap = false;
          
          for (const otherTime of timeSlots) {
            if (otherTime === time) continue;
            
            if (allocatedTeachers[day][otherTime].includes(teacherForClass) &&
                isTimeSlotOverlapping(time, classDuration, otherTime, 60)) {
              hasOverlap = true;
              break;
            }
          }
          
          if (hasOverlap) continue;
          
          // Verificar disponibilidade de sala
          if (optimizedSchedule[day][time].length < 2) {
            const score = calculateClassScore(className, time, day, preferences);
            
            // Só alocar se tiver uma pontuação positiva
            if (score > 0) {
              const roomNumber = optimizedSchedule[day][time].length + 1;
              
              optimizedSchedule[day][time].push({
                class: className,
                room: roomNumber,
                teacher: teacherForClass,
                score
              });
              
              allocatedTeachers[day][time].push(teacherForClass);
              allocated = true;
              
              console.log(`Alocado ${className} com ${teacherForClass} em ${day} ${time} (Sala ${roomNumber}, Score: ${score.toFixed(2)})`);
            }
          }
        }
      }
    }

    // 3. Preencher slots vazios com aulas menos populares
    console.log("Preenchendo slots vazios com aulas menos populares");
    
    for (const day of days) {
      for (const time of timeSlots) {
        // Se ainda tiver espaço para mais aulas neste horário
        if (optimizedSchedule[day][time].length < 2) {
          // Verificar quais professores já estão alocados neste horário
          const allocatedTeachersInSlot = allocatedTeachers[day][time];
          
          // Tentar alocar professores que não estão alocados neste horário
          for (const [teacherId, teacher] of Object.entries(teachers)) {
            // Pular se este professor já está alocado neste horário
            if (allocatedTeachersInSlot.includes(teacher.name)) continue;
            
            // Verificar se há sobreposição com aulas existentes do mesmo professor
            let hasOverlap = false;
            
            for (const otherTime of timeSlots) {
              if (otherTime === time) continue;
              
              if (allocatedTeachers[day][otherTime].includes(teacher.name) &&
                  isTimeSlotOverlapping(time, 60, otherTime, 60)) {
                hasOverlap = true;
                break;
              }
            }
            
            if (hasOverlap) continue;
            
            // Escolher uma aula deste professor que ainda não foi alocada muito
            const remainingClasses = teacher.classes.filter(c => {
              // Contar quantas vezes esta aula já foi alocada
              let count = 0;
              
              for (const d of days) {
                for (const t of timeSlots) {
                  for (const slot of optimizedSchedule[d][t]) {
                    if (slot.class === c.name) count++;
                  }
                }
              }
              
              // Considerar aulas que foram alocadas menos de 3 vezes
              return count < 3;
            });
            
            if (remainingClasses.length === 0) continue;
            
            // Ordenar por popularidade
            remainingClasses.sort((a, b) => 
              (classPopularity[b.name] || 0) - (classPopularity[a.name] || 0)
            );
            
            const selectedClass = remainingClasses[0];
            const score = calculateClassScore(selectedClass.name, time, day, preferences);
            
            // Só alocar se tiver uma pontuação não muito negativa
            if (score > -2) {
              const roomNumber = optimizedSchedule[day][time].length + 1;
              
              optimizedSchedule[day][time].push({
                class: selectedClass.name,
                room: roomNumber,
                teacher: teacher.name,
                score
              });
              
              allocatedTeachers[day][time].push(teacher.name);
              
              console.log(`Preenchido slot vazio com ${selectedClass.name} (${teacher.name}) em ${day} ${time} (Sala ${roomNumber}, Score: ${score.toFixed(2)})`);
            }
            
            // Parar se já preencheu todas as salas
            if (optimizedSchedule[day][time].length >= 2) break;
          }
        }
      }
    }

    console.log("Horário gerado com sucesso");

    return new Response(
      JSON.stringify({ 
        schedule: optimizedSchedule,
        message: "Horário gerado com sucesso pela IA"
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
