// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bcxbmtekswmoaorhlbek.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeGJtdGVrc3dtb2FvcmhsYmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjU2ODIsImV4cCI6MjA1NTU0MTY4Mn0.-TV3FrRDQnnUfRgNQ00ua3HtfEB1CYWn7aFnKPpiTgU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);