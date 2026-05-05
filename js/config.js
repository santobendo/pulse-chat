/* ============================================================
   PULSE CHAT — Supabase Configuration
   Replace SUPABASE_ANON_KEY with your actual anon key from:
   Supabase Dashboard → Settings → API → Project API Keys
   ============================================================ */

const PULSE_CONFIG = {
    SUPABASE_URL: 'https://ukshhalmcsirxauupyyf.supabase.co',
    SUPABASE_ANON_KEY: '', // Deixe vazio aqui e configure na Vercel para mais segurança!
    MESSAGES_LIMIT: 50,
    MAX_MESSAGE_LENGTH: 500,
    NICKNAME_MIN: 3,
    NICKNAME_MAX: 20,
};
