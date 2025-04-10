
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
      if (className) {
        popularity[className] = (popularity[className] || 0) + (6 - i); // Peso maior para primeiras escolhas
      }
    }
  });
  
  console.log("Favorite classes:", popularity);
  return popularity;
}

// Função para calcular a popularidade dos blocos de horário
function calculateTimeBlockPopularity(preferences: any[]) {
  const popularity: { [key: string]: number } = {};
  
  preferences.forEach(pref => {
    (pref.time_blocks || []).forEach((time: string) => {
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
    (pref.preferred_days || []).forEach((day: string) => {
      popularity[day] = (popularity[day] || 0) + 1;
    });
    
    (pref.unavailable_days || []).forEach((day: string) => {
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
    if (pref.time_blocks && pref.time_blocks.includes(time)) {
      score += 2;
      matchCount++;
    }
    
    // Verificar se o dia está nas preferências
    if (pref.preferred_days && pref.preferred_days.includes(day)) {
      score += 2;
      matchCount++;
    }
    
    // Verificar se o dia está nos dias indisponíveis
    if (pref.unavailable_days && pref.unavailable_days.includes(day)) {
      score -= 5;
      matchCount++;
    }
    
    // Verificar ranking da aula nas preferências
    for (let i = 1; i <= 5; i++) {
      if (pref[`favorite_class_${i}`] === className) {
        score += (6 - i) * 2; // Aumentar o peso para favoritos
        matchCount++;
        break;
      }
    }
  });
  
  // Se não tiver nenhuma correlação com preferências, dar uma pontuação base
  if (matchCount === 0) {
    return 0.5; // Pontuação base positiva baixa
  }
  
  return score / matchCount;
}

// Função para verificar compatibilidade de horário para um professor
function isTeacherAvailable(teacher: string, day: string, time: string, allocatedTeachers: Record<string, Record<string, string[]>>, teacherObj: Teacher) {
  // Verificar se o professor já está alocado neste horário
  if (allocatedTeachers[day][time].includes(teacher)) {
    return false;
  }
  
  // Verificar sobreposição com outros horários
  const classDuration = 60; // Assumimos duração padrão de 60 minutos
  
  for (const otherTime of timeSlots) {
    if (otherTime === time) continue;
    
    if (allocatedTeachers[day][otherTime].includes(teacher) && 
        isTimeSlotOverlapping(time, classDuration, otherTime, 60)) {
      return false;
    }
  }
  
  return true;
}

// Função para verificar se um horário é fixo para Zumba
function isFixedZumbaTime(day: string, time: string) {
  return (day === "Terça" && time === "19:00 - 20:00") || 
         (day === "Quinta" && time === "18:30 - 19:30");
}

// Função para calcular a distribuição ideal de aulas através dos dias
function calculateDistributionScore(className: string, day: string, currentDistribution: Record<string, Record<string, number>>) {
  // Verificar quantas vezes esta aula já foi alocada neste dia
  const dayCount = currentDistribution[day][className] || 0;
  
  // Cálculo da penalidade por concentração no mesmo dia
  return -1 * dayCount; // Quanto mais aulas já tiver neste dia, menor a pontuação
}

// Função para encontrar o professor de uma determinada aula
function findTeacherForClass(className: string): { teacherId: string, teacherName: string, duration: number } | null {
  for (const [teacherId, teacher] of Object.entries(teachers)) {
    const foundClass = teacher.classes.find(c => c.name === className);
    if (foundClass) {
      return { 
        teacherId, 
        teacherName: teacher.name, 
        duration: foundClass.duration 
      };
    }
  }
  return null;
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

    // Manter registro de distribuição de aulas por dia
    const classDistributionByDay: Record<string, Record<string, number>> = {};
    days.forEach(day => {
      classDistributionByDay[day] = {};
    });

    // Manter contagem de cada aula alocada para distribuição equilibrada
    const classAllocationCount: Record<string, number> = {};
    
    // 1. PRIMEIRO: Alocar APENAS os horários fixos de Zumba (Professor 1)
    console.log("Alocando horários fixos de Zumba - ESTRITAMENTE nas horas determinadas");
    
    // Limpar quaisquer alocações existentes de Zumba
    let zumbaAllocated = 0;
    
    teachers.professor1.fixedSchedule?.forEach(({ day, time }) => {
      console.log(`Alocando Zumba fixo em ${day} ${time}`);
      
      // Garantir que a sala 1 está disponível
      if (optimizedSchedule[day][time].some(slot => slot.room === 1)) {
        // Se já tem algo na sala 1, mover para sala 2 se possível
        const existingSlot = optimizedSchedule[day][time].find(slot => slot.room === 1);
        if (existingSlot && !optimizedSchedule[day][time].some(slot => slot.room === 2)) {
          existingSlot.room = 2;
          console.log(`Movendo ${existingSlot.class} para sala 2 para acomodar Zumba`);
        }
      }
      
      // Adicionar Zumba na sala 1
      optimizedSchedule[day][time].push({
        class: "Zumba",
        room: 1,
        teacher: "Professor 1",
        score: calculateClassScore("Zumba", time, day, preferences).toFixed(2)
      });
      
      allocatedTeachers[day][time].push("Professor 1");
      classAllocationCount["Zumba"] = (classAllocationCount["Zumba"] || 0) + 1;
      
      // Registrar na distribuição de aulas por dia
      classDistributionByDay[day]["Zumba"] = (classDistributionByDay[day]["Zumba"] || 0) + 1;
      
      zumbaAllocated++;
    });
    
    console.log(`Total de aulas de Zumba alocadas: ${zumbaAllocated}`);
    if (zumbaAllocated !== 2) {
      console.warn("ATENÇÃO: Número incorreto de aulas de Zumba alocadas!");
    }

    // 2. Configurar ordenação de aulas, dias e horários por popularidade
    const sortedClasses = Object.entries(classPopularity)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([className]) => className)
      .filter(className => className !== "Zumba"); // Excluir Zumba que já foi alocada
    
    const sortedDays = [...days];
    const sortedTimeSlots = [...timeSlots];
    
    // 3. Distribuir as aulas mais populares por todos os dias e horários
    // Primeiro processamos as aulas mais populares por todos os dias para garantir boa distribuição
    console.log("Distribuindo aulas populares por todos os dias e horários");
    
    // Para cada dia, tentar preencher todos os horários com até 2 aulas por horário (uma em cada sala)
    for (const day of sortedDays) {
      console.log(`Processando dia: ${day}`);
      
      // Para cada horário deste dia
      for (const time of sortedTimeSlots) {
        // Pular horários fixos de Zumba (que já foram preenchidos)
        if (isFixedZumbaTime(day, time)) {
          continue;
        }
        
        // Verificar salas disponíveis neste horário
        const availableRooms = [1, 2].filter(room => 
          !optimizedSchedule[day][time].some(slot => slot.room === room)
        );
        
        // Para cada sala disponível, tentar alocar a melhor aula
        for (const room of availableRooms) {
          // Encontrar a melhor aula para esta combinação de dia/hora/sala
          let bestClass = null;
          let bestScore = -Infinity;
          let bestTeacher = null;
          
          for (const className of sortedClasses) {
            // Pular aulas já muito alocadas para não sobrecarregar o horário
            const currentCount = classAllocationCount[className] || 0;
            const maxClassOccurrences = 4; // Limitar cada aula a no máximo 4 ocorrências na semana
            if (currentCount >= maxClassOccurrences) continue;
            
            // Encontrar o professor para esta aula
            const teacherInfo = findTeacherForClass(className);
            if (!teacherInfo) continue;
            
            // Verificar se o professor está disponível neste horário
            if (!isTeacherAvailable(
                teacherInfo.teacherName, 
                day, 
                time, 
                allocatedTeachers,
                teachers[teacherInfo.teacherId]
            )) {
              continue;
            }
            
            // Calcular pontuação para esta aula
            const preferenceScore = calculateClassScore(className, time, day, preferences);
            
            // Calcular penalidade por distribuição
            const distributionScore = calculateDistributionScore(className, day, classDistributionByDay);
            
            // Calcular penalidade por frequência global
            const frequencyPenalty = currentCount * 0.1;
            
            // Pontuação final: preferências + distribuição - frequência
            const finalScore = preferenceScore + distributionScore - frequencyPenalty;
            
            if (finalScore > bestScore) {
              bestScore = finalScore;
              bestClass = className;
              bestTeacher = teacherInfo.teacherName;
            }
          }
          
          // Se encontrou uma aula adequada, alocar
          if (bestClass && bestTeacher && bestScore > -1) { // Exigir pontuação mínima
            optimizedSchedule[day][time].push({
              class: bestClass,
              room: room,
              teacher: bestTeacher,
              score: bestScore.toFixed(2)
            });
            
            // Atualizar registros
            allocatedTeachers[day][time].push(bestTeacher);
            classAllocationCount[bestClass] = (classAllocationCount[bestClass] || 0) + 1;
            classDistributionByDay[day][bestClass] = (classDistributionByDay[day][bestClass] || 0) + 1;
            
            console.log(`Alocado ${bestClass} com ${bestTeacher} em ${day} ${time} (Sala ${room}, Score: ${bestScore.toFixed(2)})`);
          }
        }
      }
    }

    // 4. Segunda passada para preencher slots vazios
    console.log("Realizando segunda passada para preencher slots vazios");
    
    // Agora, relaxar restrições para preencher horários vazios
    for (const day of days) {
      for (const time of timeSlots) {
        // Pular horários fixos de Zumba
        if (isFixedZumbaTime(day, time)) {
          continue;
        }
        
        // Verificar salas disponíveis neste horário
        const availableRooms = [1, 2].filter(room => 
          !optimizedSchedule[day][time].some(slot => slot.room === room)
        );
        
        // Se não há nenhuma aula alocada, tentar forçar a alocação
        if (optimizedSchedule[day][time].length === 0 && availableRooms.length > 0) {
          console.log(`Tentando preencher slot vazio em ${day} ${time}`);
          
          // Procurar professores disponíveis
          const availableTeachers = Object.entries(teachers).filter(([id, teacher]) => {
            if (id === "professor1") return false; // Pular Professor 1 (Zumba)
            return isTeacherAvailable(teacher.name, day, time, allocatedTeachers, teacher);
          });
          
          if (availableTeachers.length > 0) {
            // Pegar o primeiro professor disponível
            const [teacherId, teacher] = availableTeachers[0];
            
            // Encontrar a aula menos alocada deste professor
            const teacherClasses = teacher.classes.map(c => ({
              ...c,
              count: classAllocationCount[c.name] || 0
            })).sort((a, b) => a.count - b.count);
            
            if (teacherClasses.length > 0) {
              const selectedClass = teacherClasses[0];
              
              optimizedSchedule[day][time].push({
                class: selectedClass.name,
                room: availableRooms[0],
                teacher: teacher.name,
                score: "0.50" // Pontuação base para preenchimento forçado
              });
              
              // Atualizar registros
              allocatedTeachers[day][time].push(teacher.name);
              classAllocationCount[selectedClass.name] = (classAllocationCount[selectedClass.name] || 0) + 1;
              classDistributionByDay[day][selectedClass.name] = (classDistributionByDay[day][selectedClass.name] || 0) + 1;
              
              console.log(`Preenchido slot vazio com ${selectedClass.name} (${teacher.name}) em ${day} ${time} (Sala ${availableRooms[0]})`);
            }
          }
        }
      }
    }

    // 5. Verificar cobertura de salas em cada horário
    console.log("Verificando cobertura de salas por horário");
    let totalTimeSlots = days.length * timeSlots.length;
    let filledSlots = 0;
    let totalClassesAllocated = 0;
    
    for (const day of days) {
      for (const time of timeSlots) {
        const slotCount = optimizedSchedule[day][time].length;
        if (slotCount > 0) {
          filledSlots++;
          totalClassesAllocated += slotCount;
        }
      }
    }
    
    const coveragePercentage = (filledSlots / totalTimeSlots) * 100;
    console.log(`Cobertura de horários: ${coveragePercentage.toFixed(2)}% (${filledSlots}/${totalTimeSlots})`);
    console.log(`Total de aulas alocadas: ${totalClassesAllocated}`);
    
    // 6. Verificação final RIGOROSA para garantir que Zumba só aparece nos horários fixos
    console.log("Verificação RIGOROSA final de Zumba");
    let zumbaCount = 0;
    let zumbaLocations: string[] = [];
    
    for (const day of days) {
      for (const time of timeSlots) {
        const slots = optimizedSchedule[day][time];
        const zumbaSlots = slots.filter(slot => slot.class === "Zumba");
        
        zumbaCount += zumbaSlots.length;
        
        if (zumbaSlots.length > 0) {
          zumbaLocations.push(`${day} ${time}`);
          
          // Verificar se este é um dos horários fixos permitidos
          const isAllowedTime = isFixedZumbaTime(day, time);
          
          if (!isAllowedTime) {
            console.error(`ERRO: Zumba encontrada em horário não permitido: ${day} ${time}`);
            // Remover esta alocação indevida
            optimizedSchedule[day][time] = slots.filter(s => s.class !== "Zumba");
            zumbaCount -= zumbaSlots.length;
          }
        }
      }
    }
    
    console.log(`Verificação final de Zumba: Total: ${zumbaCount} aulas em: ${zumbaLocations.join(", ")}`);
    
    if (zumbaCount !== 2) {
      console.warn(`ATENÇÃO: Número incorreto de aulas de Zumba no horário final: ${zumbaCount}`);
      
      // Verificar se os dois horários fixos realmente contêm Zumba
      let terçaZumba = false;
      let quintaZumba = false;
      
      for (const location of zumbaLocations) {
        if (location === "Terça 19:00 - 20:00") terçaZumba = true;
        if (location === "Quinta 18:30 - 19:30") quintaZumba = true;
      }
      
      if (!terçaZumba) {
        console.error("ERRO CRÍTICO: Zumba não alocada na Terça às 19:00!");
        // Adicionar manualmente
        optimizedSchedule["Terça"]["19:00 - 20:00"].push({
          class: "Zumba",
          room: 1,
          teacher: "Professor 1",
          score: "1.00" // Pontuação fixa
        });
      }
      
      if (!quintaZumba) {
        console.error("ERRO CRÍTICO: Zumba não alocada na Quinta às 18:30!");
        // Adicionar manualmente
        optimizedSchedule["Quinta"]["18:30 - 19:30"].push({
          class: "Zumba",
          room: 1,
          teacher: "Professor 1",
          score: "1.00" // Pontuação fixa
        });
      }
    }

    // 7. Estatísticas finais
    console.log("Estatísticas de alocação de aulas:");
    Object.entries(classAllocationCount).forEach(([className, count]) => {
      console.log(`${className}: ${count} aulas`);
    });
    
    console.log("Distribuição por dia:");
    for (const day of days) {
      console.log(`${day}: ${Object.keys(classDistributionByDay[day]).length} tipos de aulas diferentes`);
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
