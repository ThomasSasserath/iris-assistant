// Server-only Supabase client — niemals client-seitig importieren.
// Nutzt den Service-Role-Key, der vollen Datenbankzugriff hat.
// Alle Datenzugriffe laufen über Next.js API-Routen, nie direkt vom Browser.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Fehlende Umgebungsvariablen: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein."
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
