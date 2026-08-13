/* =========================================================
   SUPABASE - ACAMPAMENTO RENOVO
   Use SOMENTE a Publishable Key no navegador.
========================================================= */

const SUPABASE_URL =
    "https://xgfywvvgtckjhypqjegv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_rqveXjLAEhEaA309HlC2hQ_a7Pd2INL";

window.supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );
