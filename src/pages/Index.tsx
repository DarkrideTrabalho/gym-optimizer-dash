
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ALL_CLASSES = [
  "Body Upper",
  "Core Express",
  "Fit Step",
  "Fullbody",
  "GAP",
  "Hiit",
  "Localizada",
  "Mobistretching",
  "Power Yoga",
  "Pilates",
  "Treino Livre",
  "Tabatta",
  "Vitta Core legs",
  "Yoga Flow",
  "Zumba"
];

const TIME_BLOCKS = [
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

const DAYS_OF_WEEK = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo"
];

const Index = () => {
  const navigate = useNavigate();
  const [selectedClasses, setSelectedClasses] = useState<string[]>(Array(5).fill(""));
  const [selectedTimeBlocks, setSelectedTimeBlocks] = useState<string[]>([]);
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [unavailableDays, setUnavailableDays] = useState<string[]>([]);
  
  const getAvailableClasses = (index: number) => {
    return ALL_CLASSES.filter(
      (className) => !selectedClasses.slice(0, index).includes(className)
    );
  };

  const handleSubmit = async () => {
    // Validate all required fields
    if (!selectedClasses.every(Boolean)) {
      toast.error("Por favor, selecione 5 aulas favoritas");
      return;
    }
    if (selectedTimeBlocks.length === 0) {
      toast.error("Por favor, selecione pelo menos um bloco de horário");
      return;
    }
    if (preferredDays.length === 0) {
      toast.error("Por favor, selecione os dias preferidos");
      return;
    }

    try {
      const { error } = await supabase.from("class_preferences").insert({
        favorite_class_1: selectedClasses[0],
        favorite_class_2: selectedClasses[1],
        favorite_class_3: selectedClasses[2],
        favorite_class_4: selectedClasses[3],
        favorite_class_5: selectedClasses[4],
        time_blocks: selectedTimeBlocks,
        preferred_days: preferredDays,
        unavailable_days: unavailableDays,
      });

      if (error) throw error;

      toast.success("Preferências salvas com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao salvar preferências");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Otimizador de Horários</h1>
          <p className="mt-2 text-gray-600">
            Por favor, preencha suas preferências de aulas e horários
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">1. Suas 5 aulas favoritas</h2>
            <div className="space-y-4">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aula favorita {index + 1}
                  </label>
                  <Select
                    value={selectedClasses[index]}
                    onValueChange={(value) => {
                      const newClasses = [...selectedClasses];
                      newClasses[index] = value;
                      setSelectedClasses(newClasses);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma aula" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableClasses(index).map((className) => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">2. Blocos de horários preferidos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {TIME_BLOCKS.map((block) => (
                <div key={block} className="flex items-center space-x-2">
                  <Checkbox
                    id={block}
                    checked={selectedTimeBlocks.includes(block)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTimeBlocks([...selectedTimeBlocks, block]);
                      } else {
                        setSelectedTimeBlocks(selectedTimeBlocks.filter((b) => b !== block));
                      }
                    }}
                  />
                  <label htmlFor={block} className="text-sm text-gray-700">
                    {block}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">3. Dias preferidos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={`preferred-${day}`}
                    checked={preferredDays.includes(day)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setPreferredDays([...preferredDays, day]);
                      } else {
                        setPreferredDays(preferredDays.filter((d) => d !== day));
                      }
                    }}
                  />
                  <label htmlFor={`preferred-${day}`} className="text-sm text-gray-700">
                    {day}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">4. Dias indisponíveis</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={`unavailable-${day}`}
                    checked={unavailableDays.includes(day)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setUnavailableDays([...unavailableDays, day]);
                      } else {
                        setUnavailableDays(unavailableDays.filter((d) => d !== day));
                      }
                    }}
                  />
                  <label htmlFor={`unavailable-${day}`} className="text-sm text-gray-700">
                    {day}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <Button
              onClick={handleSubmit}
              className="w-full flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Enviar Preferências</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
