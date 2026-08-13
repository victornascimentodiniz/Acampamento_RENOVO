import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response(405, {
      success: false,
      message: "Método não permitido.",
    });
  }

  try {
    const { email, password, setupCode } = await req.json();

    const masterCode = Deno.env.get("ADMIN_SETUP_CODE");

    if (!masterCode) {
      console.error("ADMIN_SETUP_CODE não configurado.");
      return response(500, {
        success: false,
        message: "Cadastro de administrador não configurado no servidor.",
      });
    }

    if (typeof setupCode !== "string" || setupCode !== masterCode) {
      return response(403, {
        success: false,
        message: "Código mestre incorreto.",
      });
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return response(400, {
        success: false,
        message: "E-mail inválido.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return response(400, {
        success: false,
        message: "A senha precisa ter pelo menos 8 caracteres.",
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const secretMapText = Deno.env.get("SUPABASE_SECRET_KEYS");

    if (!supabaseUrl || !secretMapText) {
      console.error("Secrets padrão do Supabase não encontrados.");
      return response(500, {
        success: false,
        message: "Configuração interna do Supabase indisponível.",
      });
    }

    const secretMap = JSON.parse(secretMapText);
    const secretKey = secretMap["default"];

    if (!secretKey) {
      console.error("Secret key 'default' não encontrada.");
      return response(500, {
        success: false,
        message: "Secret key do projeto não encontrada.",
      });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      secretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
      });

    if (userError || !userData.user) {
      console.error("Erro ao criar usuário:", userError);

      const duplicate =
        userError?.message?.toLowerCase().includes("already") ||
        userError?.message?.toLowerCase().includes("registered");

      return response(400, {
        success: false,
        message: duplicate
          ? "Já existe um usuário com esse e-mail."
          : "Não foi possível criar o usuário administrador.",
      });
    }

    const newUserId = userData.user.id;

    const { error: adminError } =
      await supabaseAdmin
        .from("administradores")
        .insert({ user_id: newUserId });

    if (adminError) {
      console.error("Erro ao inserir administrador:", adminError);

      await supabaseAdmin.auth.admin.deleteUser(newUserId);

      return response(500, {
        success: false,
        message: "Usuário criado, mas não foi possível conceder permissão de administrador.",
      });
    }

    return response(200, {
      success: true,
      message: "Administrador criado com sucesso.",
    });
  } catch (error) {
    console.error("Erro interno:", error);

    return response(500, {
      success: false,
      message: "Erro interno ao criar administrador.",
    });
  }
});
