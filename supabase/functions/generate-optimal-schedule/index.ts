
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
    name: "Professor 3",
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
    name: "Professor 1",
    classes: [
      { name: "Pilates", duration: 60 },
      { name: "Power Yoga", duration: 60 },
      { name: "Yoga Flow", duration: 60 }
    ]
  }
};

const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
const timeSlots = [
  "10:00 - 11:30",
  "16:00 - 20:30",
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
  // Extrair horários de início e converter para minutos para cálculos precisos
  const [startHour1, startMinute1] = slot1.split(' - ')[0].split(':').map(Number);
  const [startHour2, startMinute2] = slot2.split(' - ')[0].split(':').map(Number);
  
  // Converter para minutos desde o início do dia
  const startMinutes1 = startHour1 * 60 + startMinute1;
  const startMinutes2 = startHour2 * 60 + startMinute2;
  
  // Calcular horários de término em minutos
  const endMinutes1 = startMinutes1 + duration1;
  const endMinutes2 = startMinutes2 + duration2;
  
  // Verificar sobreposição: se o início de um é anterior ao fim do outro e vice-versa
  const overlaps = startMinutes1 < endMinutes2 && startMinutes2 < endMinutes1;
  
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
function isRoomAvailable(room: number, day: string, time: string, duration: number, occupiedSlots: Array<{time: string, duration: number, room: number}>) {
  // Verificar se a sala já está ocupada em algum horário que se sobreponha
  for (const slot of occupiedSlots) {
    if (slot.room === room && isTimeSlotOverlapping(time, duration, slot.time, slot.duration)) {
      return false;
    }
  }
  return true;
}

// Função para verificar compatibilidade de horário para um professor
function isTeacherAvailable(teacher: string, day: string, time: string, duration: number, allocatedTeachers: Array<{time: string, duration: number, teacher: string}>) {
  // Verificar se o professor já está alocado em algum horário que se sobreponha
  for (const allocation of allocatedTeachers) {
    if (allocation.teacher === teacher && 
        isTimeSlotOverlapping(time, duration, allocation.time, allocation.duration)) {
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
  return -1.5 * dayCount; // Aumentado o peso da penalidade por distribuição
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

    // Manter registro de professores já alocados em cada dia
    const allocatedTeachers: Record<string, Array<{time: string, duration: number, teacher: string}>> = {};
    days.forEach(day => {
      allocatedTeachers[day] = [];
    });

    // Manter registro de salas já alocadas em cada dia
    const allocatedRooms: Record<string, Array<{time: string, duration: number, room: number}>> = {};
    days.forEach(day => {
      allocatedRooms[day] = [];
    });

    // Manter registro de distribuição de aulas por dia
    const classDistributionByDay: Record<string, Record<string, number>> = {};
    days.forEach(day => {
      classDistributionByDay[day] = {};
    });

    // Manter contagem de cada aula alocada para distribuição equilibrada
    const classAllocationCount: Record<string, number> = {};
    
    // 1. PRIMEIRO: Alocar APENAS os horários fixos de Zumba (Professor 3)
    console.log("Alocando horários fixos de Zumba - ESTRITAMENTE nas horas determinadas");
    
    teachers.professor1.fixedSchedule?.forEach(({ day, time }) => {
      console.log(`Alocando Zumba fixo em ${day} ${time}`);
      
      // Adicionar Zumba na sala 1
      optimizedSchedule[day][time].push({
        class: "Zumba",
        room: 1,
        teacher: "Professor 3",
        score: calculateClassScore("Zumba", time, day, preferences).toFixed(2)
      });
      
      // Marcar professor e sala como alocados
      allocatedTeachers[day].push({
        time,
        duration: 60, // Duração padrão de Zumba
        teacher: "Professor 3"
      });
      
      allocatedRooms[day].push({
        time,
        duration: 60,
        room: 1
      });
      
      classAllocationCount["Zumba"] = (classAllocationCount["Zumba"] || 0) + 1;
      
      // Registrar na distribuição de aulas por dia
      classDistributionByDay[day]["Zumba"] = (classDistributionByDay[day]["Zumba"] || 0) + 1;
    });
    
    console.log(`Total de aulas de Zumba alocadas: ${classAllocationCount["Zumba"] || 0}`);

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
        // Verificar se este é um horário fixo de Zumba
        const isZumbaFixedTime = isFixedZumbaTime(day, time);
        
        // Para horários com Zumba fixa, processar apenas a sala 2
        // Para outros horários, processar ambas as salas
        const roomsToProcess = isZumbaFixedTime ? [2] : [1, 2];
        
        for (const room of roomsToProcess) {
          // Verificar se esta sala já está ocupada neste horário
          const teacherInfo = room === 1 && isZumbaFixedTime 
            ? { teacherId: "professor1", teacherName: "Professor 3", duration: 60 }
            : null;
          
          // Se não for o horário fixo de Zumba na sala 1, procurar a melhor aula
          if (!teacherInfo) {
            let bestClass = null;
            let bestScore = -Infinity;
            let bestTeacherInfo = null;
            
            for (const className of sortedClasses) {
              // Encontrar o professor para esta aula
              const currentTeacherInfo = findTeacherForClass(className);
              if (!currentTeacherInfo) continue;
              
              // Verificar se o professor está disponível neste horário
              if (!isTeacherAvailable(
                  currentTeacherInfo.teacherName, 
                  day, 
                  time,
                  currentTeacherInfo.duration,
                  allocatedTeachers[day]
              )) {
                continue;
              }
              
              // Verificar se a sala está disponível considerando a duração da aula
              if (!isRoomAvailable(
                  room, 
                  day, 
                  time, 
                  currentTeacherInfo.duration,
                  allocatedRooms[day]
              )) {
                continue;
              }
              
              // Calcular pontuação para esta aula
              const preferenceScore = calculateClassScore(className, time, day, preferences);
              
              // Calcular penalidade por distribuição no mesmo dia
              const distributionScore = calculateDistributionScore(className, day, classDistributionByDay);
              
              // Calcular penalidade por frequência global da aula na semana
              const currentCount = classAllocationCount[className] || 0;
              const maxClassOccurrences = 4; // Limitar cada aula a no máximo 4 ocorrências na semana
              if (currentCount >= maxClassOccurrences) continue;
              
              const frequencyPenalty = currentCount * 0.2; // Aumentado o peso da penalidade por frequência
              
              // Pontuação final
              const finalScore = preferenceScore + distributionScore - frequencyPenalty;
              
              if (finalScore > bestScore) {
                bestScore = finalScore;
                bestClass = className;
                bestTeacherInfo = currentTeacherInfo;
              }
            }
            
            // Se encontrou uma aula adequada, alocar
            if (bestClass && bestTeacherInfo && bestScore > -1) {
              optimizedSchedule[day][time].push({
                class: bestClass,
                room: room,
                teacher: bestTeacherInfo.teacherName,
                score: bestScore.toFixed(2)
              });
              
              // Atualizar registros
              allocatedTeachers[day].push({
                time,
                duration: bestTeacherInfo.duration,
                teacher: bestTeacherInfo.teacherName
              });
              
              allocatedRooms[day].push({
                time,
                duration: bestTeacherInfo.duration,
                room
              });
              
              classAllocationCount[bestClass] = (classAllocationCount[bestClass] || 0) + 1;
              classDistributionByDay[day][bestClass] = (classDistributionByDay[day][bestClass] || 0) + 1;
              
              console.log(`Alocado ${bestClass} com ${bestTeacherInfo.teacherName} em ${day} ${time} (Sala ${room}, Score: ${bestScore.toFixed(2)})`);
            }
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
        if (isFixedZumbaTime(day, time) && optimizedSchedule[day][time].some(slot => slot.class === "Zumba")) {
          // Para horários com Zumba, tentar preencher apenas a sala 2 se ainda estiver vazia
          if (!optimizedSchedule[day][time].some(slot => slot.room === 2)) {
            // Verificar se a sala 2 está disponível com as regras de sobreposição
            const isRoom2Available = isRoomAvailable(2, day, time, 60, allocatedRooms[day]);
            
            if (isRoom2Available) {
              // Procurar professores disponíveis
              const availableTeachers = Object.entries(teachers).filter(([id, teacher]) => {
                if (id === "professor1") return false; // Pular Professor 3 (Zumba)
                return isTeacherAvailable(teacher.name, day, time, 60, allocatedTeachers[day]);
              });
              
              if (availableTeachers.length > 0) {
                // Escolher professor menos utilizado
                const teacherUsage = availableTeachers.map(([id, teacher]) => {
                  let count = 0;
                  days.forEach(d => {
                    count += allocatedTeachers[d].filter(allocation => 
                      allocation.teacher === teacher.name).length;
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
                  
                  optimizedSchedule[day][time].push({
                    class: selectedClass.name,
                    room: 2,
                    teacher: teacher.name,
                    score: "0.50" // Pontuação base para preenchimento forçado
                  });
                  
                  // Atualizar registros
                  allocatedTeachers[day].push({
                    time,
                    duration: selectedClass.duration,
                    teacher: teacher.name
                  });
                  
                  allocatedRooms[day].push({
                    time,
                    duration: selectedClass.duration,
                    room: 2
                  });
                  
                  classAllocationCount[selectedClass.name] = (classAllocationCount[selectedClass.name] || 0) + 1;
                  classDistributionByDay[day][selectedClass.name] = (classDistributionByDay[day][selectedClass.name] || 0) + 1;
                  
                  console.log(`Preenchido slot vazio com ${selectedClass.name} (${teacher.name}) em ${day} ${time} (Sala 2)`);
                }
              }
            }
          }
          
          continue; // Continuar para o próximo horário após tratar sala 2 em horário de Zumba
        }
        
        // Para horários regulares (sem Zumba fixa), processar ambas as salas
        for (const room of [1, 2]) {
          // Verificar se esta sala já está ocupada neste horário
          if (optimizedSchedule[day][time].some(slot => slot.room === room)) {
            continue;
          }
          
          // Verificar se a sala está disponível com as regras de sobreposição
          const isRoomFree = isRoomAvailable(room, day, time, 60, allocatedRooms[day]);
          
          if (!isRoomFree) {
            continue;
          }
          
          // Procurar professores disponíveis
          const availableTeachers = Object.entries(teachers).filter(([id, teacher]) => {
            if (id === "professor1") return false; // Pular Professor 3 (Zumba)
            return isTeacherAvailable(teacher.name, day, time, 60, allocatedTeachers[day]);
          });
          
          if (availableTeachers.length > 0) {
            // Escolher professor menos utilizado
            const teacherUsage = availableTeachers.map(([id, teacher]) => {
              let count = 0;
              days.forEach(d => {
                count += allocatedTeachers[d].filter(allocation => 
                  allocation.teacher === teacher.name).length;
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
              
              optimizedSchedule[day][time].push({
                class: selectedClass.name,
                room: room,
                teacher: teacher.name,
                score: "0.50" // Pontuação base para preenchimento forçado
              });
              
              // Atualizar registros
              allocatedTeachers[day].push({
                time,
                duration: selectedClass.duration,
                teacher: teacher.name
              });
              
              allocatedRooms[day].push({
                time,
                duration: selectedClass.duration,
                room
              });
              
              classAllocationCount[selectedClass.name] = (classAllocationCount[selectedClass.name] || 0) + 1;
              classDistributionByDay[day][selectedClass.name] = (classDistributionByDay[day][selectedClass.name] || 0) + 1;
              
              console.log(`Preenchido slot vazio com ${selectedClass.name} (${teacher.name}) em ${day} ${time} (Sala ${room})`);
            }
          }
        }
      }
    }

    // 5. Verificação final RIGOROSA para garantir que Zumba só aparece nos horários fixos
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
    
    // Garantir que os horários fixos de Zumba estão alocados
    if (zumbaCount !== 2) {
      console.warn(`ATENÇÃO: Número incorreto de aulas de Zumba no horário final: ${zumbaCount}`);
      
      // Verificar se os dois horários fixos realmente contêm Zumba
      let tercaZumba = false;
      let quintaZumba = false;
      
      for (const location of zumbaLocations) {
        if (location === "Terça 19:00 - 20:00") tercaZumba = true;
        if (location === "Quinta 18:30 - 19:30") quintaZumba = true;
      }
      
      if (!tercaZumba) {
        console.error("ERRO CRÍTICO: Zumba não alocada na Terça às 19:00!");
        // Adicionar manualmente
        optimizedSchedule["Terça"]["19:00 - 20:00"].push({
          class: "Zumba",
          room: 1,
          teacher: "Professor 3",
          score: "1.00" // Pontuação fixa
        });
      }
      
      if (!quintaZumba) {
        console.error("ERRO CRÍTICO: Zumba não alocada na Quinta às 18:30!");
        // Adicionar manualmente
        optimizedSchedule["Quinta"]["18:30 - 19:30"].push({
          class: "Zumba",
          room: 1,
          teacher: "Professor 3",
          score: "1.00" // Pontuação fixa
        });
      }
    }

    // 6. Verificação e correção final de sobreposições de horários
    console.log("Verificação final de sobreposições de horários");
    for (const day of days) {
      // Verificar sobreposições entre diferentes slots de horário para cada sala
      const slotsToRemove: Array<{time: string, room: number}> = [];
      
      // Para cada sala, verificar sobreposições
      for (const room of [1, 2]) {
        // Extrair todas as aulas desta sala neste dia
        const roomSlots: Array<{
          time: string, 
          class: string, 
          score: string,
          duration: number
        }> = [];
        
        for (const time of timeSlots) {
          const slots = optimizedSchedule[day][time];
          for (const slot of slots) {
            if (slot.room === room) {
              const teacherInfo = findTeacherForClass(slot.class);
              const duration = teacherInfo ? teacherInfo.duration : 60;
              
              roomSlots.push({
                time,
                class: slot.class,
                score: slot.score,
                duration
              });
            }
          }
        }
        
        // Ordenar os slots por horário
        roomSlots.sort((a, b) => {
          const [hourA, minuteA] = a.time.split(' - ')[0].split(':').map(Number);
          const [hourB, minuteB] = b.time.split(' - ')[0].split(':').map(Number);
          return (hourA * 60 + minuteA) - (hourB * 60 + minuteB);
        });
        
        // Verificar sobreposições entre os slots desta sala
        for (let i = 0; i < roomSlots.length; i++) {
          for (let j = i + 1; j < roomSlots.length; j++) {
            const slotA = roomSlots[i];
            const slotB = roomSlots[j];
            
            if (isTimeSlotOverlapping(slotA.time, slotA.duration, slotB.time, slotB.duration)) {
              console.log(`Sobreposição detectada em ${day}, sala ${room}: ${slotA.class} (${slotA.time}) e ${slotB.class} (${slotB.time})`);
              
              // Se um dos slots for Zumba em horário fixo, manter Zumba
              if (slotA.class === "Zumba" && isFixedZumbaTime(day, slotA.time)) {
                slotsToRemove.push({time: slotB.time, room});
              } 
              else if (slotB.class === "Zumba" && isFixedZumbaTime(day, slotB.time)) {
                slotsToRemove.push({time: slotA.time, room});
              }
              // Se nenhum for Zumba, remover o de menor pontuação
              else if (parseFloat(slotA.score) >= parseFloat(slotB.score)) {
                slotsToRemove.push({time: slotB.time, room});
              } else {
                slotsToRemove.push({time: slotA.time, room});
              }
            }
          }
        }
      }
      
      // Remover os slots com sobreposição
      for (const {time, room} of slotsToRemove) {
        console.log(`Removendo slot com sobreposição: ${day} ${time} sala ${room}`);
        optimizedSchedule[day][time] = optimizedSchedule[day][time].filter(slot => slot.room !== room);
      }
    }

    // 7. Balanceamento final: garantir que cada sala tenha aulas bem distribuídas
    console.log("Realizando balanceamento final de aulas por sala");
    
    // Calculando estatísticas finais
    let totalRoomUsage = { 1: 0, 2: 0 };
    let slotsWithSingleClass = 0;
    let totalTimeSlots = days.length * timeSlots.length;
    
    for (const day of days) {
      for (const time of timeSlots) {
        const slots = optimizedSchedule[day][time];
        
        if (slots.length === 1) {
          slotsWithSingleClass++;
          totalRoomUsage[slots[0].room]++;
        } else if (slots.length === 2) {
          totalRoomUsage[1]++;
          totalRoomUsage[2]++;
        }
      }
    }
    
    console.log(`Estatísticas de uso das salas: Sala 1: ${totalRoomUsage[1]}, Sala 2: ${totalRoomUsage[2]}`);
    console.log(`Slots com apenas uma aula: ${slotsWithSingleClass}/${totalTimeSlots}`);
    
    console.log("Estatísticas de alocação de aulas:");
    Object.entries(classAllocationCount).forEach(([className, count]) => {
      console.log(`${className}: ${count} aulas`);
    });

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
        message: error.message || "Erro interno ao gerar horário"
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'status': '500'
        },
        status: 500
      }
    );
  }
});
