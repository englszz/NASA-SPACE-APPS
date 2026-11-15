import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para el navegador. La clave "anon" es pública por diseño:
// lo que protege los datos son las reglas RLS de supabase/schema.sql.
export function supabaseBrowser() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export const supabaseConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
