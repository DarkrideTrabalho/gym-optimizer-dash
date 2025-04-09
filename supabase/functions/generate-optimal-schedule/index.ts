
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

    // Manter registro de professores já alocados em cada horário/dia
    const allocatedTeachers: Record<string, Record<string, string[]>> = {};
    days.forEach(day => {
      allocatedTeachers[day] = {};
      timeSlots.forEach(time => {
        allocatedTeachers[day][time] = [];
      });
    });

    // Manter contagem de cada aula alocada para distribuição equilibrada
    const classAllocationCount: Record<string, number> = {};
    
    // 1. PRIMEIRO: Alocar APENAS os horários fixos de Zumba (Professor 1)
    console.log("Alocando horários fixos de Zumba - ESTRITAMENTE nas horas determinadas");
    
    // Limpar quaisquer alocações existentes de Zumba para garantir que só apareça nos horários fixos
    let zumbaAllocated = 0;
    
    teachers.professor1.fixedSchedule?.forEach(({ day, time }) => {
      console.log(`Alocando Zumba fixo em ${day} ${time}`);
      optimizedSchedule[day][time].push({
        class: "Zumba",
        room: 1,
        teacher: "Professor 1",
        score: calculateClassScore("Zumba", time, day, preferences)
      });
      
      allocatedTeachers[day][time].push("Professor 1");
      classAllocationCount["Zumba"] = (classAllocationCount["Zumba"] || 0) + 1;
      zumbaAllocated++;
    });
    
    console.log(`Total de aulas de Zumba alocadas: ${zumbaAllocated}`);
    if (zumbaAllocated !== 2) {
      console.warn("ATENÇÃO: Número incorreto de aulas de Zumba alocadas!");
    }

    // 2. Ordenar dias, horários e classes por popularidade para otimizar alocação
    console.log("Ordenando dias, horários e classes por popularidade");
    
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

    // 3. Distribuir aulas populares para todos os dias da semana
    // Processamos dia por dia para garantir uma distribuição equilibrada
    console.log("Distribuindo aulas populares para todos os dias");
    
    for (const day of days) {
      console.log(`Processando dia: ${day}`);
      
      // Filtrar aulas adequadas para este dia (pular Zumba que já foi alocada)
      const eligibleClasses = sortedClasses.filter(c => c !== "Zumba");
      
      // Para este dia, tentar alocar aulas em cada horário disponível
      for (const time of sortedTimeSlots) {
        // Pular horários fixos de Zumba
        if ((day === "Terça" && time === "19:00 - 20:00") || 
            (day === "Quinta" && time === "18:30 - 19:30")) {
          continue;
        }
        
        // Tentar alocar até 2 aulas neste horário (uma em cada sala)
        for (let room = 1; room <= 2; room++) {
          // Verificar se já temos alguma aula neste slot/sala
          if (optimizedSchedule[day][time].some(slot => slot.room === room)) {
            continue;
          }
          
          // Encontrar a melhor aula para este horário
          let bestClass = null;
          let bestScore = -1;
          let bestTeacher = null;
          
          for (const className of eligibleClasses) {
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
            
            // Verificar se este professor já está alocado neste horário
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
            
            // Calcular pontuação para esta aula
            const score = calculateClassScore(className, time, day, preferences);
            
            // Considerar também a distribuição da aula entre os dias para evitar concentração
            const currentCount = classAllocationCount[className] || 0;
            const distributionPenalty = currentCount * 0.2; // Penalizar aulas já muito alocadas
            
            const finalScore = score - distributionPenalty;
            
            if (finalScore > bestScore && finalScore > 0) {
              bestScore = finalScore;
              bestClass = className;
              bestTeacher = teacherForClass;
            }
          }
          
          // Se encontrou uma aula adequada, alocar
          if (bestClass && bestTeacher) {
            optimizedSchedule[day][time].push({
              class: bestClass,
              room: room,
              teacher: bestTeacher,
              score: bestScore.toFixed(2)
            });
            
            allocatedTeachers[day][time].push(bestTeacher);
            classAllocationCount[bestClass] = (classAllocationCount[bestClass] || 0) + 1;
            
            console.log(`Alocado ${bestClass} com ${bestTeacher} em ${day} ${time} (Sala ${room}, Score: ${bestScore.toFixed(2)})`);
          }
        }
      }
    }

    // 4. Verificar e preencher slots vazios se necessário
    console.log("Verificando slots vazios e preenchendo se necessário");
    
    for (const day of days) {
      for (const time of timeSlots) {
        // Pular horários fixos de Zumba
        if ((day === "Terça" && time === "19:00 - 20:00") || 
            (day === "Quinta" && time === "18:30 - 19:30")) {
          continue;
        }
        
        // Se ainda tiver espaço para mais aulas neste horário
        if (optimizedSchedule[day][time].length < 2) {
          const availableRooms = [1, 2].filter(room => 
            !optimizedSchedule[day][time].some(slot => slot.room === room)
          );
          
          for (const room of availableRooms) {
            // Verificar quais professores já estão alocados neste horário
            const allocatedTeachersInSlot = allocatedTeachers[day][time];
            const availableTeachers = Object.entries(teachers)
              .filter(([, teacher]) => !allocatedTeachersInSlot.includes(teacher.name))
              .map(([, teacher]) => teacher);
            
            // Encontrar uma aula adequada dentre os professores disponíveis
            let allocated = false;
            
            for (const teacher of availableTeachers) {
              if (allocated) break;
              if (teacher.name === "Professor 1") continue; // Zumba já foi alocada nos horários fixos
              
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
              
              // Ordenar as aulas deste professor por popularidade e menor frequência de alocação
              const eligibleClasses = teacher.classes
                .map(c => ({
                  ...c,
                  popularity: classPopularity[c.name] || 0,
                  allocCount: classAllocationCount[c.name] || 0
                }))
                .sort((a, b) => {
                  // Priorizar aulas menos alocadas e mais populares
                  if (a.allocCount !== b.allocCount) {
                    return a.allocCount - b.allocCount; // Menos alocações primeiro
                  }
                  return b.popularity - a.popularity; // Mais populares primeiro
                });
              
              if (eligibleClasses.length > 0) {
                const selectedClass = eligibleClasses[0];
                const score = calculateClassScore(selectedClass.name, time, day, preferences);
                
                // Só alocar se tiver uma pontuação não muito negativa
                if (score > -2) {
                  optimizedSchedule[day][time].push({
                    class: selectedClass.name,
                    room: room,
                    teacher: teacher.name,
                    score: score.toFixed(2)
                  });
                  
                  allocatedTeachers[day][time].push(teacher.name);
                  classAllocationCount[selectedClass.name] = (classAllocationCount[selectedClass.name] || 0) + 1;
                  allocated = true;
                  
                  console.log(`Preenchido slot vazio com ${selectedClass.name} (${teacher.name}) em ${day} ${time} (Sala ${room}, Score: ${score.toFixed(2)})`);
                }
              }
            }
          }
        }
      }
    }

    // 5. Verificação final para garantir que Zumba só aparece nos horários fixos
    let zumbaCount = 0;
    for (const day of days) {
      for (const time of timeSlots) {
        const slots = optimizedSchedule[day][time];
        for (const slot of slots) {
          if (slot.class === "Zumba") {
            zumbaCount++;
            // Verificar se este é um dos horários fixos permitidos
            const isAllowedTime = 
              (day === "Terça" && time === "19:00 - 20:00") || 
              (day === "Quinta" && time === "18:30 - 19:30");
            
            if (!isAllowedTime) {
              console.error(`ERRO: Zumba encontrada em horário não permitido: ${day} ${time}`);
              // Remover esta alocação indevida
              optimizedSchedule[day][time] = slots.filter(s => s.class !== "Zumba");
              zumbaCount--;
            }
          }
        }
      }
    }
    
    console.log(`Verificação final: Total de aulas de Zumba: ${zumbaCount}`);
    if (zumbaCount !== 2) {
      console.warn(`ATENÇÃO: Número incorreto de aulas de Zumba no horário final: ${zumbaCount}`);
    }

    // 6. Estatísticas de alocação de aulas
    console.log("Estatísticas de alocação de aulas:");
    Object.entries(classAllocationCount).forEach(([className, count]) => {
      console.log(`${className}: ${count} aulas`);
    });

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
