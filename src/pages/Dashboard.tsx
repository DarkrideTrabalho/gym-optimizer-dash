
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const [favoriteClassesData, setFavoriteClassesData] = useState([]);
  const [timeBlocksData, setTimeBlocksData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("class_preferences")
        .select("*");

      if (error) throw error;

      // Process data for favorite classes
      const classesCount: { [key: string]: number } = {};
      data.forEach((preference) => {
        [
          preference.favorite_class_1,
          preference.favorite_class_2,
          preference.favorite_class_3,
          preference.favorite_class_4,
          preference.favorite_class_5,
        ].forEach((className) => {
          classesCount[className] = (classesCount[className] || 0) + 1;
        });
      });

      const favoriteClasses = Object.entries(classesCount).map(([name, count]) => ({
        name,
        count,
      }));
      favoriteClasses.sort((a, b) => b.count - a.count);
      setFavoriteClassesData(favoriteClasses);

      // Process data for time blocks
      const timeBlocks: { [key: string]: number } = {};
      data.forEach((preference) => {
        preference.time_blocks.forEach((block: string) => {
          timeBlocks[block] = (timeBlocks[block] || 0) + 1;
        });
      });

      const timeBlocksArray = Object.entries(timeBlocks).map(([time, count]) => ({
        time,
        count,
      }));
      timeBlocksArray.sort((a, b) => b.count - a.count);
      setTimeBlocksData(timeBlocksArray);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Análise</h1>
          <p className="mt-2 text-gray-600">
            Visualização das preferências dos alunos
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Aulas Mais Populares</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={favoriteClassesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Horários Mais Procurados</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeBlocksData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
