/* =========================================================
   CONFIGURAÇÃO DO SUPABASE
   ACAMPAMENTO RENOVO
========================================================= */

const SUPABASE_URL =
    "https://xgfywvvgtckjhypqjegv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_rqveXjLAEhEaA309HlC2hQ_a7Pd2INL";


/* =========================================================
   CRIAR CONEXÃO COM O SUPABASE
========================================================= */

window.supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


console.log(
    "Supabase conectado com sucesso!"
);
