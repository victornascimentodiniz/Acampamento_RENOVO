const SUPABASE_URL =
    "https://xgfywvvgtckjhypqjegv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "COLE_AQUI_A_CHAVE_sb_publishable";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

console.log("Supabase conectado!");
