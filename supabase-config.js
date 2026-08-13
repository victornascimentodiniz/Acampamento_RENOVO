const SUPABASE_URL =
    "https://xgfywvvgtckjhypqjegv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_abc123xyz456";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );
