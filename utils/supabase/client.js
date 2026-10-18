import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dngdvqkvhtabpfskmhan.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_N_dHFFD0hGGKrN5KOP_TJw_RkdU2Pwd';

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
};
