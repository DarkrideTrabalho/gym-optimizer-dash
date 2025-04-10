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

// Função APRIMORADA para verificar se dois horários se sobrepõem
function isTimeSlotOverlapping(slot1: string, duration1: number, slot2: string, duration2: number) {
  // Extrair horários de início e converter para objetos Date para cálculos precisos
  const [startHour1, startMinute1] = slot1.split(' - ')[0].split(':').map(Number);
  const [startHour2, startMinute2] = slot2.split(' - ')[0].split(':').map(Number);
  
  // Criar objetos Date para comparação (usando uma data base arbitrária)
  const time1 = new Date(2023, 0, 1, startHour1, startMinute1);
  const time2 = new Date(2023, 0, 1, startHour2, startMinute2);
  
  // Calcular horários de término
  const end1 = new Date(time1.getTime() + duration1 * 60000);
  const end2 = new Date(time2.getTime() + duration2 * 60000);
  
  // Verificar sobreposição: se o início de um é anterior ao fim do outro e vice-versa
  const overlaps = time1 < end2 && time2 < end1;
  
  if (overlaps) {
    console.log(`SOBREPOSIÇÃO DETECTADA: ${slot1} (${duration1}min) sobrepõe com ${slot2} (${duration2}min)`);
  }
  
  return overlaps;
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

// Função APRIMORADA para verificar disponibilidade da sala
function isRoomAvailable(room: number, day: string, time: string, timeSlotDuration: number, allocatedRooms: Record<string, Record<string, Record<number, boolean>>>) {
  // Se a sala já está alocada neste horário específico
  if (allocatedRooms[day][time][room]) {
    return false;
  }
  
  // Verificar sobreposição com outros horários para esta sala
  for (const otherTime of timeSlots) {
    if (otherTime === time) continue;
    
    // Se esta sala já está alocada em outro horário, verificar sobreposição
    if (allocatedRooms[day][otherTime][room]) {
      // Assumir duração padrão de 60 minutos para o outro horário
      if (isTimeSlotOverlapping(time, timeSlotDuration, otherTime, 60)) {
        return false;
      }
    }
  }
  
  return true;
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

    // Manter registro de salas já alocadas em cada horário/dia (NOVO)
    const allocatedRooms: Record<string, Record<string, Record<number, boolean>>> = {};
    days.forEach(day => {
      allocatedRooms[day] = {};
      timeSlots.forEach(time => {
        allocatedRooms[day][time] = {
          1: false,
          2: false
        };
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
      
      // Adicionar Zumba na sala 1
      optimizedSchedule[day][time].push({
        class: "Zumba",
        room: 1,
        teacher: "Professor 1",
        score: calculateClassScore("Zumba", time, day, preferences).toFixed(2)
      });
      
      // Marcar professor e sala como alocados
      allocatedTeachers[day][time].push("Professor 1");
      allocatedRooms[day][time][1] = true;
      
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
    
    const sortedDays = [...days].sort((a, b) => {
      return (dayAnalysis.popularity[b] || 0) - (dayAnalysis.popularity[a] || 0);
    });
    
    const sortedTimeSlots = [...timeSlots].sort((a, b) => {
      return (timeBlockPopularity[b] || 0) - (timeBlockPopularity[a] || 0);
    });
    
    // 3. Distribuir as aulas mais populares por todos os dias e horários
    console.log("Distribuindo aulas populares por todos os dias e horários");
    
    // Para cada dia, tentar preencher todos os horários com até 2 aulas por horário (uma em cada sala)
    for (const day of sortedDays) {
      console.log(`Processando dia: ${day}`);
      
      // Para cada horário deste dia
      for (const time of sortedTimeSlots) {
        // Pular horários fixos de Zumba (que já foram preenchidos na sala 1)
        if (isFixedZumbaTime(day, time)) {
          // Para horários com Zumba, tentar preencher apenas a sala 2
          if (!allocatedRooms[day][time][2]) {
            // Encontrar a melhor aula para esta combinação de dia/hora na sala 2
            let bestClass = null;
            let bestScore = -Infinity;
            let bestTeacher = null;
            
            for (const className of sortedClasses) {
              // Aplicar as mesmas verificações para sala 2 mesmo em horário de Zumba
              const teacherInfo = findTeacherForClass(className);
              if (!teacherInfo || teacherInfo.teacherName === "Professor 1") continue;
              
              // Verificar se o professor está disponível
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
              const currentCount = classAllocationCount[className] || 0;
              const frequencyPenalty = currentCount * 0.1;
              
              // Pontuação final
              const finalScore = preferenceScore + distributionScore - frequencyPenalty;
              
              if (finalScore > bestScore) {
                bestScore = finalScore;
                bestClass = className;
                bestTeacher = teacherInfo.teacherName;
              }
            }
            
            // Se encontrou uma aula adequada, alocar na sala 2
            if (bestClass && bestTeacher && bestScore > -1) {
              optimizedSchedule[day][time].push({
                class: bestClass,
                room: 2,
                teacher: bestTeacher,
                score: bestScore.toFixed(2)
              });
              
              // Atualizar registros
              allocatedTeachers[day][time].push(bestTeacher);
              allocatedRooms[day][time][2] = true;
              classAllocationCount[bestClass] = (classAllocationCount[bestClass] || 0) + 1;
              classDistributionByDay[day][bestClass] = (classDistributionByDay[day][bestClass] || 0) + 1;
              
              console.log(`Alocado ${bestClass} com ${bestTeacher} em ${day} ${time} (Sala 2, Score: ${bestScore.toFixed(2)})`);
            }
          }
          
          continue; // Continuar para o próximo horário após tratar sala 2 em horário de Zumba
        }
        
        // Para horários regulares (sem Zumba fixa), processar ambas as salas
        for (const room of [1, 2]) {
          // Verificar se esta sala já está ocupada neste horário
          if (allocatedRooms[day][time][room]) {
            continue;
          }
          
          // Encontrar a melhor aula para esta combinação de dia/hora/sala
          let bestClass = null;
          let bestScore = -Infinity;
          let bestTeacher = null;
          let bestDuration = 60; // Duração padrão
          
          for (const className of sortedClasses) {
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
            
            // Verificar se a sala está disponível considerando a duração da aula
            if (!isRoomAvailable(room, day, time, teacherInfo.duration, allocatedRooms)) {
              continue;
            }
            
            // Calcular pontuação para esta aula
            const preferenceScore = calculateClassScore(className, time, day, preferences);
            
            // Calcular penalidade por distribuição
            const distributionScore = calculateDistributionScore(className, day, classDistributionByDay);
            
            // Calcular penalidade por frequência global
            const currentCount = classAllocationCount[className] || 0;
            const maxClassOccurrences = 4; // Limitar cada aula a no máximo 4 ocorrências na semana
            if (currentCount >= maxClassOccurrences) continue;
            
            const frequencyPenalty = currentCount * 0.1;
            
            // Pontuação final
            const finalScore = preferenceScore + distributionScore - frequencyPenalty;
            
            if (finalScore > bestScore) {
              bestScore = finalScore;
              bestClass = className;
              bestTeacher = teacherInfo.teacherName;
              bestDuration = teacherInfo.duration;
            }
          }
          
          // Se encontrou uma aula adequada, alocar
          if (bestClass && bestTeacher && bestScore > -1) {
            optimizedSchedule[day][time].push({
              class: bestClass,
              room: room,
              teacher: bestTeacher,
              score: bestScore.toFixed(2)
            });
            
            // Atualizar registros
            allocatedTeachers[day][time].push(bestTeacher);
            allocatedRooms[day][time][room] = true;
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
        // Pular horários fixos de Zumba que já têm uma aula na sala 1
        if (isFixedZumbaTime(day, time)) {
          continue;
        }
        
        // Verificar salas disponíveis neste horário
        for (const room of [1, 2]) {
          // Se esta sala já está ocupada, pular
          if (allocatedRooms[day][time][room]) {
            continue;
          }
          
          // Verificar se outras salas neste horário já estão ocupadas
          const hasOtherRoomOccupied = Object.entries(allocatedRooms[day][time])
            .some(([r, occupied]) => r !== room.toString() && occupied);
            
          // Priorizar horários que já têm pelo menos uma sala ocupada
          if (!hasOtherRoomOccupied && optimizedSchedule[day][time].length > 0) {
            continue;
          }
          
          console.log(`Tentando preencher slot vazio em ${day} ${time}, sala ${room}`);
          
          // Procurar professores disponíveis
          const availableTeachers = Object.entries(teachers).filter(([id, teacher]) => {
            if (id === "professor1") return false; // Pular Professor 1 (Zumba)
            return isTeacherAvailable(teacher.name, day, time, allocatedTeachers, teacher);
          });
          
          if (availableTeachers.length > 0) {
            // Escolher professor menos utilizado
            const teacherUsage = availableTeachers.map(([id, teacher]) => {
              let count = 0;
              days.forEach(d => {
                timeSlots.forEach(t => {
                  if (allocatedTeachers[d][t].includes(teacher.name)) {
                    count++;
                  }
                });
              });
              return { id, teacher, count };
            });
            
            teacherUsage.sort((a, b) => a.count - b.count);
            const [teacherId, teacher] = [teacherUsage[0].id, teacherUsage[0].teacher];
            
            // Encontrar a aula menos alocada deste professor
            const teacherClasses = teacher.classes.map(c => ({
              ...c,
              count: classAllocationCount[c.name] || 0
            })).sort((a, b) => a.count - b.count);
            
            if (teacherClasses.length > 0) {
              const selectedClass = teacherClasses[0];
              
              // Verificar se a sala está disponível com esta duração
              if (!isRoomAvailable(room, day, time, selectedClass.duration, allocatedRooms)) {
                continue;
              }
              
              optimizedSchedule[day][time].push({
                class: selectedClass.name,
                room: room,
                teacher: teacher.name,
                score: "0.50" // Pontuação base para preenchimento forçado
              });
              
              // Atualizar registros
              allocatedTeachers[day][time].push(teacher.name);
              allocatedRooms[day][time][room] = true;
              classAllocationCount[selectedClass.name] = (classAllocationCount[selectedClass.name] || 0) + 1;
              classDistributionByDay[day][selectedClass.name] = (classDistributionByDay[day][selectedClass.name] || 0) + 1;
              
              console.log(`Preenchido slot vazio com ${selectedClass.name} (${teacher.name}) em ${day} ${time} (Sala ${room})`);
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

    // 8. Verificação e correção final de sobreposições de horários
    console.log("Verificação final de sobreposições de horários");
    for (const day of days) {
      // Criar uma lista de todas as aulas alocadas neste dia
      const dayClasses: Array<{
        time: string;
        room: number;
        className: string;
        teacher: string;
        score: string;
        duration: number;
      }> = [];
      
      for (const time of timeSlots) {
        const slots = optimizedSchedule[day][time];
        for (const slot of slots) {
          const teacherInfo = findTeacherForClass(slot.class);
          const duration = teacherInfo ? teacherInfo.duration : 60;
          
          dayClasses.push({
            time,
            room: slot.room,
            className: slot.class,
            teacher: slot.teacher,
            score: slot.score,
            duration
          });
        }
      }
      
      // Ordenar as aulas por hora de início para verificação
      dayClasses.sort((a, b) => {
        const [hourA, minuteA] = a.time.split(' - ')[0].split(':').map(Number);
        const [hourB, minuteB] = b.time.split(' - ')[0].split(':').map(Number);
        return (hourA * 60 + minuteA) - (hourB * 60 + minuteB);
      });
      
      // Verificar sobreposições e remover conflitos
      const conflictsToRemove: Array<{time: string, room: number}> = [];
      
      for (let i = 0; i < dayClasses.length; i++) {
        for (let j = i + 1; j < dayClasses.length; j++) {
          const classA = dayClasses[i];
          const classB = dayClasses[j];
          
          // Se são na mesma sala e se sobrepõem
          if (classA.room === classB.room && 
              isTimeSlotOverlapping(classA.time, classA.duration, classB.time, classB.duration)) {
            console.error(`CONFLITO DETECTADO: ${classA.className} (${classA.time}, Sala ${classA.room}) ` +
                          `sobrepõe com ${classB.className} (${classB.time}, Sala ${classB.room})`);
            
            // Se um dos horários for Zumba fixa, manter Zumba e remover o outro
            if (classA.className === "Zumba" && isFixedZumbaTime(day, classA.time)) {
              conflictsToRemove.push({time: classB.time, room: classB.room});
            } 
            else if (classB.className === "Zumba" && isFixedZumbaTime(day, classB.time)) {
              conflictsToRemove.push({time: classA.time, room: classA.room});
            }
            // Senão, remover o com menor pontuação
            else if (parseFloat(classA.score) >= parseFloat(classB.score)) {
              conflictsToRemove.push({time: classB.time, room: classB.room});
            } else {
              conflictsToRemove.push({time: classA.time, room: classA.room});
            }
          }
        }
      }
      
      // Remover as aulas conflitantes
      for (const conflict of conflictsToRemove) {
        console.log(`Removendo aula em conflito: ${day} ${conflict.time} Sala ${conflict.room}`);
        optimizedSchedule[day][conflict.time] = optimizedSchedule[day][conflict.time].filter(
          slot => slot.room !== conflict.room
        );
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
        message: error.message || "Erro interno
