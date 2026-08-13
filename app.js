/* =========================================================
   ACAMPAMENTO RENOVO
   Aplicação conectada ao Supabase
========================================================= */

/* =========================================================
   LOGIN TEMPORÁRIO PARA TESTES
   IMPORTANTE:
   - Esse acesso fica visível no código público do GitHub.
   - Use somente durante os testes.
   - Para voltar ao login real do Supabase, altere
     TEST_ADMIN_MODE para false.
========================================================= */

const TEST_ADMIN_MODE = true;

const TEST_ADMIN_EMAIL =
    "victornascimento311@gmail.com";

const TEST_ADMIN_PASSWORD =
    "terrao";


let toastTimeout;
let currentItems = [];
let currentParticipants = [];
let realtimeChannel = null;
let refreshTimer = null;
let isRefreshing = false;


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    if (!window.supabaseClient) {
        console.error("Supabase não foi carregado.");
        alert(
            "Não foi possível conectar ao banco de dados. " +
            "Verifique o arquivo supabase-config.js."
        );
        return;
    }

    const page = document.body.dataset.page;

    try {
        if (page === "login") {
            await initLogin();
        }

        if (page === "admin") {
            await initAdmin();
        }

        if (page === "user") {
            await initUser();
        }

        if (page === "reset-password") {
            await initResetPassword();
        }
    } catch (error) {
        console.error("Erro ao iniciar a aplicação:", error);
        showToast("Ocorreu um erro ao carregar o sistema.");
    }
});


/* =========================================================
   UTILITÁRIOS
========================================================= */

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    return date.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}


function showToast(message) {
    const toast = document.getElementById("toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}


function calculatePercentage(item) {
    if (!item || !item.meta) {
        return 0;
    }

    return Math.min(
        100,
        Math.round((Number(item.doado || 0) / Number(item.meta)) * 100)
    );
}


function getRemaining(item) {
    return Math.max(
        0,
        Number(item.meta || 0) - Number(item.doado || 0)
    );
}


function setButtonLoading(button, loading, normalText, loadingText = "Aguarde...") {
    if (!button) {
        return;
    }

    button.disabled = loading;
    button.textContent = loading ? loadingText : normalText;
}


function friendlyDatabaseError(error, fallback) {
    console.error(error);

    if (!error) {
        return fallback;
    }

    if (error.code === "23505") {
        return "Esse nome já está cadastrado.";
    }

    if (error.message && error.message.includes("Quantidade maior")) {
        return error.message;
    }

    return fallback;
}


/* =========================================================
   AUTENTICAÇÃO
========================================================= */

async function isCurrentUserAdmin() {
    const {
        data: { session },
        error: sessionError
    } = await window.supabaseClient.auth.getSession();

    if (sessionError || !session) {
        return false;
    }

    const { data, error } =
        await window.supabaseClient.rpc("eh_administrador");

    if (error) {
        console.error("Erro ao verificar administrador:", error);
        return false;
    }

    return data === true;
}


async function initLogin() {
    const btnDoar = document.getElementById("btnDoar");
    const btnAdmin = document.getElementById("btnAdmin");
    const areaLogin = document.getElementById("areaLogin");
    const btnFechar = document.getElementById("btnFechar");
    const formLogin = document.getElementById("formLogin");
    const emailInput = document.getElementById("adminEmail");
    const passwordInput = document.getElementById("senha");
    const btnMostrarSenha = document.getElementById("btnMostrarSenha");
    const erroLogin = document.getElementById("erroLogin");
    const btnEntrar = document.getElementById("btnEntrar");
    const btnEsqueciSenha = document.getElementById("btnEsqueciSenha");
    const secretHeart = document.getElementById("secretAdminHeart");
    const createAdminModal = document.getElementById("createAdminModal");
    const closeCreateAdminModal = document.getElementById("closeCreateAdminModal");
    const createAdminForm = document.getElementById("createAdminForm");

    let secretHeartClicks = 0;
    let secretHeartTimer = null;

    btnDoar?.addEventListener("click", () => {
        window.location.href = "igreja.html";
    });

    /* =====================================================
       CADASTRO SECRETO DE ADMINISTRADOR
       10 CLIQUES NO CORAÇÃO EM ATÉ 6 SEGUNDOS
    ===================================================== */

    const closeCreateAdmin = () => {
        createAdminModal?.classList.remove("show");
        createAdminForm?.reset();

        const errorElement =
            document.getElementById("createAdminError");

        if (errorElement) {
            errorElement.textContent = "";
        }

        document.body.style.overflow = "";
    };

    secretHeart?.addEventListener("click", () => {
        secretHeartClicks += 1;

        clearTimeout(secretHeartTimer);

        secretHeartTimer = setTimeout(() => {
            secretHeartClicks = 0;
        }, 6000);

        if (secretHeartClicks < 10) {
            return;
        }

        secretHeartClicks = 0;
        clearTimeout(secretHeartTimer);

        createAdminModal?.classList.add("show");
        document.body.style.overflow = "hidden";

        setTimeout(() => {
            document
                .getElementById("createAdminEmail")
                ?.focus();
        }, 100);
    });

    closeCreateAdminModal?.addEventListener(
        "click",
        closeCreateAdmin
    );

    createAdminModal?.addEventListener("click", (event) => {
        if (event.target === createAdminModal) {
            closeCreateAdmin();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && createAdminModal?.classList.contains("show")) {
            closeCreateAdmin();
        }
    });

    createAdminForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email =
            document.getElementById("createAdminEmail").value.trim();

        const password =
            document.getElementById("createAdminPassword").value;

        const passwordConfirm =
            document.getElementById("createAdminPasswordConfirm").value;

        const setupCode =
            document.getElementById("createAdminMasterCode").value;

        const errorElement =
            document.getElementById("createAdminError");

        const button =
            document.getElementById("btnCreateAdmin");

        errorElement.textContent = "";

        if (!email) {
            errorElement.textContent = "Informe um e-mail válido.";
            return;
        }

        if (password.length < 8) {
            errorElement.textContent =
                "A senha precisa ter pelo menos 8 caracteres.";
            return;
        }

        if (password !== passwordConfirm) {
            errorElement.textContent =
                "As duas senhas não são iguais.";
            return;
        }

        if (!setupCode) {
            errorElement.textContent =
                "Informe o código mestre.";
            return;
        }

        setButtonLoading(
            button,
            true,
            "Criar administrador",
            "Criando..."
        );

        const { data, error } =
            await window.supabaseClient.functions.invoke(
                "criar-admin",
                {
                    body: {
                        email,
                        password,
                        setupCode
                    }
                }
            );

        setButtonLoading(
            button,
            false,
            "Criar administrador"
        );

        if (error) {
            console.error("Erro da Edge Function:", error);

            let message =
                "Não foi possível criar o administrador.";

            try {
                const payload =
                    await error.context?.json?.();

                if (payload?.message) {
                    message = payload.message;
                }
            } catch (_) {
                // Usa a mensagem padrão.
            }

            errorElement.textContent = message;
            return;
        }

        if (!data?.success) {
            errorElement.textContent =
                data?.message ||
                "Não foi possível criar o administrador.";
            return;
        }

        closeCreateAdmin();

        showToast(
            "Administrador criado com sucesso! Já é possível entrar com o novo e-mail e senha."
        );
    });

    btnAdmin?.addEventListener("click", async () => {
        const admin = await isCurrentUserAdmin();

        if (admin) {
            window.location.href = "administrador.html";
            return;
        }

        areaLogin?.classList.add("show");
        erroLogin.textContent = "";

        setTimeout(() => {
            emailInput?.focus();
        }, 100);

        areaLogin?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });

    btnFechar?.addEventListener("click", () => {
        areaLogin?.classList.remove("show");
        erroLogin.textContent = "";
        passwordInput.value = "";
    });

    btnMostrarSenha?.addEventListener("click", () => {
        const showing = passwordInput.type === "text";

        passwordInput.type = showing ? "password" : "text";
        btnMostrarSenha.textContent = showing ? "Mostrar" : "Ocultar";
    });

    btnEsqueciSenha?.addEventListener("click", async () => {
        const email = emailInput.value.trim();

        if (!email) {
            erroLogin.textContent =
                "Digite primeiro o e-mail do administrador para receber o link.";
            emailInput.focus();
            return;
        }

        erroLogin.textContent = "";

        setButtonLoading(
            btnEsqueciSenha,
            true,
            "Esqueci minha senha",
            "Enviando..."
        );

        const redirectTo =
            "https://victornascimentodiniz.github.io/Acampamento_RENOVO/redefinir-senha.html";

        const { error } =
            await window.supabaseClient.auth.resetPasswordForEmail(
                email,
                { redirectTo }
            );

        setButtonLoading(
            btnEsqueciSenha,
            false,
            "Esqueci minha senha"
        );

        if (error) {
            console.error(error);
            erroLogin.textContent =
                "Não foi possível enviar o e-mail de recuperação. Tente novamente.";
            return;
        }

        showToast(
            "E-mail de recuperação enviado. Confira também a caixa de spam."
        );
    });

    formLogin?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        erroLogin.textContent = "";

        /*
         * =====================================================
         * LOGIN TEMPORÁRIO PARA TESTES
         * =====================================================
         */
        if (TEST_ADMIN_MODE) {
            if (
                email === TEST_ADMIN_EMAIL &&
                password === TEST_ADMIN_PASSWORD
            ) {
                sessionStorage.setItem(
                    "adminTeste",
                    "true"
                );

                sessionStorage.setItem(
                    "adminTesteEmail",
                    TEST_ADMIN_EMAIL
                );

                window.location.href =
                    "administrador.html";

                return;
            }

            erroLogin.textContent =
                "E-mail ou senha de teste incorretos.";

            passwordInput.select();

            return;
        }

        /*
         * =====================================================
         * LOGIN REAL DO SUPABASE
         * =====================================================
         */
        if (!email || !password) {
            erroLogin.textContent =
                "Informe o e-mail e a senha.";

            return;
        }

        setButtonLoading(
            btnEntrar,
            true,
            "Entrar no painel",
            "Entrando..."
        );

        const { error: loginError } =
            await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (loginError) {
            erroLogin.textContent =
                "E-mail ou senha incorretos. Confira o usuário criado no Supabase.";

            setButtonLoading(
                btnEntrar,
                false,
                "Entrar no painel"
            );

            passwordInput.select();

            return;
        }

        const admin =
            await isCurrentUserAdmin();

        if (!admin) {
            await window.supabaseClient.auth.signOut();

            erroLogin.textContent =
                "Este usuário existe, mas não está cadastrado como administrador.";

            setButtonLoading(
                btnEntrar,
                false,
                "Entrar no painel"
            );

            return;
        }

        window.location.href =
            "administrador.html";
    });

}


/* =========================================================
   CONSULTAS AO BANCO
========================================================= */

async function fetchItemsWithDonations() {
    const [
        { data: itemRows, error: itemsError },
        { data: donationRows, error: donationsError }
    ] = await Promise.all([
        window.supabaseClient
            .from("itens")
            .select("*")
            .eq("ativo", true)
            .order("criado_em", { ascending: false }),

        window.supabaseClient
            .from("doacoes")
            .select("*")
            .order("criado_em", { ascending: false })
    ]);

    if (itemsError) {
        throw itemsError;
    }

    if (donationsError) {
        throw donationsError;
    }

    const donationsByItem = new Map();

    for (const row of donationRows || []) {
        if (!donationsByItem.has(row.item_id)) {
            donationsByItem.set(row.item_id, []);
        }

        donationsByItem.get(row.item_id).push({
            id: row.id,
            nome: row.nome_doador,
            quantidade: Number(row.quantidade),
            data: row.criado_em
        });
    }

    return (itemRows || []).map((row) => {
        const doacoes = donationsByItem.get(row.id) || [];

        const doado = doacoes.reduce(
            (total, donation) =>
                total + Number(donation.quantidade || 0),
            0
        );

        return {
            id: row.id,
            nome: row.nome,
            descricao: row.descricao || "",
            meta: Number(row.quantidade_necessaria),
            doado,
            ativo: row.ativo,
            criadoEm: row.criado_em,
            doacoes
        };
    });
}


async function fetchParticipants() {
    const { data, error } =
        await window.supabaseClient
            .from("participantes")
            .select("*")
            .order("criado_em", { ascending: true });

    if (error) {
        throw error;
    }

    return (data || []).map((row) => ({
        id: row.id,
        nome: row.nome,
        data: row.criado_em
    }));
}


/* =========================================================
   ATUALIZAÇÃO AUTOMÁTICA
========================================================= */

function startLiveUpdates(page) {
    stopLiveUpdates();

    const refresh = async () => {
        if (document.hidden || isRefreshing) {
            return;
        }

        isRefreshing = true;

        try {
            if (page === "admin") {
                await refreshAdminData();
            }

            if (page === "user") {
                await refreshUserData();
            }
        } catch (error) {
            console.error("Falha na atualização automática:", error);
        } finally {
            isRefreshing = false;
        }
    };

    realtimeChannel =
        window.supabaseClient
            .channel(`renovo-${page}-${Date.now()}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "itens"
                },
                refresh
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "doacoes"
                },
                refresh
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "participantes"
                },
                refresh
            )
            .subscribe();

    /*
     * Mesmo que o Realtime ainda não esteja habilitado no painel,
     * este timer mantém as páginas sincronizadas periodicamente.
     */
    refreshTimer = setInterval(refresh, 30000);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            refresh();
        }
    });
}


function stopLiveUpdates() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }

    if (realtimeChannel) {
        window.supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}


/* =========================================================
   ADMINISTRADOR
========================================================= */

async function initAdmin() {
    const adminTeste =
        sessionStorage.getItem("adminTeste") === "true";

    /*
     * Se o modo temporário estiver ativo e o login de teste
     * tiver sido validado, permite abrir o painel.
     */
    if (TEST_ADMIN_MODE && adminTeste) {
        console.warn(
            "Modo de administrador temporário ativo."
        );
    } else {
        const admin =
            await isCurrentUserAdmin();

        if (!admin) {
            await window.supabaseClient.auth.signOut();
            window.location.href = "index.html";
            return;
        }
    }

    const itemForm = document.getElementById("itemForm");
    const adminItems = document.getElementById("adminItems");
    const logoutAdmin = document.getElementById("logoutAdmin");
    const limparTodos = document.getElementById("limparTodos");
    const participantsContainer =
        document.getElementById("adminListaParticipantes");

    const btnMinhaConta =
        document.getElementById("btnMinhaConta");
    const accountModal =
        document.getElementById("accountModal");
    const closeAccountModal =
        document.getElementById("closeAccountModal");
    const changePasswordForm =
        document.getElementById("changePasswordForm");
    const accountEmail =
        document.getElementById("accountEmail");

    if (TEST_ADMIN_MODE && adminTeste) {
        if (btnMinhaConta) {
            btnMinhaConta.style.display = "none";
        }

        setTimeout(() => {
            showToast(
                "Modo de teste ativo. O login é temporário; ações protegidas pelo Supabase podem ser bloqueadas pelo RLS."
            );
        }, 300);
    }

    itemForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nome =
            document.getElementById("itemNome").value.trim();

        const descricao =
            document.getElementById("itemDescricao").value.trim();

        const quantidade =
            Number(document.getElementById("itemQuantidade").value);

        if (!nome || !Number.isInteger(quantidade) || quantidade <= 0) {
            showToast("Preencha corretamente o nome e a quantidade.");
            return;
        }

        const submitButton =
            itemForm.querySelector('button[type="submit"]');

        setButtonLoading(
            submitButton,
            true,
            "+ Adicionar item",
            "Salvando..."
        );

        const { error } =
            await window.supabaseClient
                .from("itens")
                .insert({
                    nome,
                    descricao: descricao || null,
                    quantidade_necessaria: quantidade,
                    ativo: true
                });

        setButtonLoading(
            submitButton,
            false,
            "+ Adicionar item"
        );

        if (error) {
      
             console.error(
                 "ERRO REAL AO CADASTRAR ITEM:",
                 error
             );
         
             showToast(
                 "Erro: " +
                 (
                     error.message ||
                     error.code ||
                     "Não foi possível cadastrar o item."
                 )
             );
         
             return;
         }

        itemForm.reset();

        await refreshAdminData();

        showToast("Item adicionado e salvo no Supabase!");
    });

    adminItems?.addEventListener("click", async (event) => {
        const button =
            event.target.closest("[data-delete-item]");

        if (!button) {
            return;
        }

        const item =
            currentItems.find(
                (value) => value.id === button.dataset.deleteItem
            );

        if (!item) {
            return;
        }

        const confirmed =
            confirm(
                `Excluir "${item.nome}"? ` +
                "As doações ligadas a esse item também serão excluídas."
            );

        if (!confirmed) {
            return;
        }

        button.disabled = true;

        const { error } =
            await window.supabaseClient
                .from("itens")
                .delete()
                .eq("id", item.id);

        if (error) {
            button.disabled = false;
            showToast("Não foi possível excluir o item.");
            console.error(error);
            return;
        }

        await refreshAdminData();

        showToast("Item excluído.");
    });

    participantsContainer?.addEventListener("click", async (event) => {
        const button =
            event.target.closest("[data-remove-participant]");

        if (!button) {
            return;
        }

        const participant =
            currentParticipants.find(
                (value) =>
                    value.id === button.dataset.removeParticipant
            );

        if (!participant) {
            return;
        }

        const confirmed =
            confirm(
                `Remover "${participant.nome}" da lista de participantes?`
            );

        if (!confirmed) {
            return;
        }

        button.disabled = true;

        const { error } =
            await window.supabaseClient
                .from("participantes")
                .delete()
                .eq("id", participant.id);

        if (error) {
            button.disabled = false;
            showToast("Não foi possível excluir o participante.");
            console.error(error);
            return;
        }

        await refreshAdminData();

        showToast("Participante removido.");
    });

    limparTodos?.addEventListener("click", async () => {
        if (currentItems.length === 0) {
            showToast("Não existem itens cadastrados.");
            return;
        }

        const confirmed =
            confirm(
                "Tem certeza que deseja excluir TODOS os itens " +
                "e todas as doações relacionadas?"
            );

        if (!confirmed) {
            return;
        }

        const ids = currentItems.map((item) => item.id);

        limparTodos.disabled = true;
        limparTodos.textContent = "Excluindo...";

        const { error } =
            await window.supabaseClient
                .from("itens")
                .delete()
                .in("id", ids);

        limparTodos.disabled = false;
        limparTodos.textContent = "Excluir todos os itens";

        if (error) {
            showToast("Não foi possível excluir todos os itens.");
            console.error(error);
            return;
        }

        await refreshAdminData();

        showToast("Todos os itens e suas doações foram excluídos.");
    });

    btnMinhaConta?.addEventListener("click", async () => {
        const {
            data: { user }
        } = await window.supabaseClient.auth.getUser();

        if (accountEmail) {
            accountEmail.textContent = user?.email || "-";
        }

        accountModal?.classList.add("show");
        document.body.style.overflow = "hidden";
    });

    closeAccountModal?.addEventListener("click", () => {
        closeAccountPasswordModal();
    });

    accountModal?.addEventListener("click", (event) => {
        if (event.target === accountModal) {
            closeAccountPasswordModal();
        }
    });

    changePasswordForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const currentPassword =
            document.getElementById("currentPassword").value;

        const newPassword =
            document.getElementById("newPassword").value;

        const confirmPassword =
            document.getElementById("confirmNewPassword").value;

        const errorElement =
            document.getElementById("changePasswordError");

        const submitButton =
            document.getElementById("btnChangePassword");

        errorElement.textContent = "";

        if (newPassword.length < 8) {
            errorElement.textContent =
                "A nova senha precisa ter pelo menos 8 caracteres.";
            return;
        }

        if (newPassword !== confirmPassword) {
            errorElement.textContent =
                "A confirmação da nova senha não confere.";
            return;
        }

        if (currentPassword === newPassword) {
            errorElement.textContent =
                "Escolha uma senha diferente da senha atual.";
            return;
        }

        setButtonLoading(
            submitButton,
            true,
            "Salvar nova senha",
            "Salvando..."
        );

        const { error } =
            await window.supabaseClient.auth.updateUser({
                password: newPassword,
                current_password: currentPassword
            });

        setButtonLoading(
            submitButton,
            false,
            "Salvar nova senha"
        );

        if (error) {
            console.error(error);

            const message =
                (error.message || "").toLowerCase();

            if (
                message.includes("password") ||
                message.includes("credential") ||
                message.includes("invalid")
            ) {
                errorElement.textContent =
                    "A senha atual está incorreta ou a nova senha não atende aos requisitos.";
            } else {
                errorElement.textContent =
                    "Não foi possível alterar a senha. Tente novamente.";
            }

            return;
        }

        closeAccountPasswordModal();

        showToast(
            "Senha alterada com sucesso!"
        );
    });

    logoutAdmin?.addEventListener("click", async () => {
        sessionStorage.removeItem("adminTeste");
        sessionStorage.removeItem("adminTesteEmail");

        await window.supabaseClient.auth.signOut();

        window.location.href = "index.html";
    });

    await refreshAdminData();

    startLiveUpdates("admin");
}


async function refreshAdminData() {
    const [items, participants] =
        await Promise.all([
            fetchItemsWithDonations(),
            fetchParticipants()
        ]);

    currentItems = items;
    currentParticipants = participants;

    renderAdminStats(currentItems);
    renderAdminItems(currentItems);
    renderDonationHistory(currentItems);
    renderParticipantsAdmin(currentParticipants);
}


function renderAdminStats(items) {
    const totalItems = items.length;

    const totalTarget =
        items.reduce(
            (sum, item) => sum + Number(item.meta || 0),
            0
        );

    const totalDonated =
        items.reduce(
            (sum, item) => sum + Number(item.doado || 0),
            0
        );

    const completed =
        items.filter(
            (item) =>
                Number(item.doado) >= Number(item.meta)
        ).length;

    setText("statItens", totalItems);
    setText("statMeta", totalTarget);
    setText("statDoado", totalDonated);
    setText("statConcluidos", completed);
}


function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


function renderAdminItems(items) {
    const container = document.getElementById("adminItems");

    if (!container) {
        return;
    }

    if (items.length === 0) {
        container.innerHTML =
            emptyStateHTML(
                "📦",
                "Nenhum item cadastrado",
                "Use o formulário acima para cadastrar o primeiro item."
            );

        return;
    }

    container.innerHTML =
        items.map(createAdminItemCard).join("");
}


function createAdminItemCard(item) {
    const percentage = calculatePercentage(item);
    const remaining = getRemaining(item);
    const completed = remaining === 0;

    const lastDonors =
        [...(item.doacoes || [])]
            .sort(
                (a, b) =>
                    new Date(b.data) - new Date(a.data)
            )
            .slice(0, 3);

    const donorHTML =
        lastDonors.length
            ? `
                <div class="donors-preview">
                    <p class="donors-preview-title">
                        ÚLTIMOS DOADORES
                    </p>

                    ${lastDonors
                        .map(
                            (donation) => `
                                <div class="donor-mini">
                                    <span>
                                        ${escapeHTML(donation.nome)}
                                    </span>

                                    <strong>
                                        +${donation.quantidade}
                                    </strong>
                                </div>
                            `
                        )
                        .join("")}
                </div>
            `
            : "";

    return `
        <article class="item-card ${completed ? "completed" : ""}">
            <div class="item-top">
                <div class="item-icon">📦</div>

                <span class="item-status ${completed ? "completed-status" : ""}">
                    ${completed ? "META ATINGIDA" : "EM ANDAMENTO"}
                </span>
            </div>

            <h3>${escapeHTML(item.nome)}</h3>

            <p class="item-description">
                ${
                    escapeHTML(item.descricao) ||
                    "Item necessário para o Acampamento RENOVO."
                }
            </p>

            <div class="progress-info">
                <span>Progresso</span>
                <strong>${percentage}%</strong>
            </div>

            <div class="progress-track">
                <div
                    class="progress-bar"
                    style="width: ${percentage}%"
                ></div>
            </div>

            <div class="item-numbers">
                <div class="item-number">
                    <span>META</span>
                    <strong>${item.meta}</strong>
                </div>

                <div class="item-number">
                    <span>DOADO</span>
                    <strong>${item.doado}</strong>
                </div>

                <div class="item-number">
                    <span>FALTAM</span>
                    <strong>${remaining}</strong>
                </div>
            </div>

            ${donorHTML}

            <div class="item-actions">
                <button
                    class="danger-outline-button"
                    data-delete-item="${item.id}"
                >
                    Excluir item
                </button>
            </div>
        </article>
    `;
}


function renderDonationHistory(items) {
    const container =
        document.getElementById("donationHistory");

    if (!container) {
        return;
    }

    const history = [];

    for (const item of items) {
        for (const donation of item.doacoes || []) {
            history.push({
                ...donation,
                itemNome: item.nome
            });
        }
    }

    history.sort(
        (a, b) =>
            new Date(b.data) - new Date(a.data)
    );

    if (history.length === 0) {
        container.innerHTML =
            emptyStateHTML(
                "♡",
                "Nenhuma doação ainda",
                "Quando uma doação for registrada, ela aparecerá aqui."
            );

        return;
    }

    container.innerHTML =
        history
            .slice(0, 50)
            .map((donation) => {
                const initial =
                    escapeHTML(
                        donation.nome
                            .charAt(0)
                            .toUpperCase()
                    );

                return `
                    <div class="history-row">
                        <div class="history-avatar">
                            ${initial}
                        </div>

                        <div class="history-person">
                            <strong>
                                ${escapeHTML(donation.nome)}
                            </strong>

                            <span>
                                ${formatDate(donation.data)}
                            </span>
                        </div>

                        <div class="history-item">
                            ${escapeHTML(donation.itemNome)}
                        </div>

                        <span class="history-quantity">
                            +${donation.quantidade}
                        </span>
                    </div>
                `;
            })
            .join("");
}


function renderParticipantsAdmin(participants) {
    const container =
        document.getElementById("adminListaParticipantes");

    const total =
        document.getElementById("adminTotalParticipantes");

    if (!container || !total) {
        return;
    }

    total.textContent = participants.length;

    if (participants.length === 0) {
        container.innerHTML =
            emptyStateHTML(
                "👥",
                "Nenhum participante confirmado",
                "Os nomes adicionados na página pública aparecerão aqui."
            );

        return;
    }

    container.innerHTML =
        participants
            .map(
                (participant, index) => `
                    <div class="admin-participante-row">
                        <div class="admin-participante-numero">
                            ${index + 1}
                        </div>

                        <div class="admin-participante-info">
                            <strong>
                                ${escapeHTML(participant.nome)}
                            </strong>

                            <span>
                                Confirmado em
                                ${formatDate(participant.data)}
                            </span>
                        </div>

                        <button
                            type="button"
                            class="remover-participante"
                            data-remove-participant="${participant.id}"
                        >
                            Excluir
                        </button>
                    </div>
                `
            )
            .join("");
}


function closeAccountPasswordModal() {
    const modal =
        document.getElementById("accountModal");

    const form =
        document.getElementById("changePasswordForm");

    const error =
        document.getElementById("changePasswordError");

    modal?.classList.remove("show");
    document.body.style.overflow = "";

    form?.reset();

    if (error) {
        error.textContent = "";
    }
}


/* =========================================================
   RECUPERAÇÃO DE SENHA
========================================================= */

async function initResetPassword() {
    const loading =
        document.getElementById("resetLoading");

    const form =
        document.getElementById("resetPasswordForm");

    const errorElement =
        document.getElementById("resetPasswordError");

    const showFormIfSessionExists = async () => {
        const {
            data: { session }
        } = await window.supabaseClient.auth.getSession();

        if (session) {
            loading.textContent =
                "Link validado. Defina sua nova senha abaixo.";

            form?.classList.remove("hidden-form");
            return true;
        }

        return false;
    };

    const alreadyReady =
        await showFormIfSessionExists();

    if (!alreadyReady) {
        const {
            data: { subscription }
        } =
            window.supabaseClient.auth.onAuthStateChange(
                async (event) => {
                    if (
                        event === "PASSWORD_RECOVERY" ||
                        event === "SIGNED_IN"
                    ) {
                        await showFormIfSessionExists();
                    }
                }
            );

        setTimeout(async () => {
            const ready =
                await showFormIfSessionExists();

            if (!ready && loading) {
                loading.textContent =
                    "O link de recuperação é inválido ou expirou. " +
                    "Solicite um novo link na página inicial.";
            }
        }, 2500);

        window.addEventListener(
            "beforeunload",
            () => subscription?.unsubscribe()
        );
    }

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const password =
            document.getElementById("resetNewPassword").value;

        const confirmation =
            document.getElementById("resetConfirmPassword").value;

        const button =
            document.getElementById("btnResetPassword");

        errorElement.textContent = "";

        if (password.length < 8) {
            errorElement.textContent =
                "A senha precisa ter pelo menos 8 caracteres.";
            return;
        }

        if (password !== confirmation) {
            errorElement.textContent =
                "As duas senhas não são iguais.";
            return;
        }

        setButtonLoading(
            button,
            true,
            "Salvar nova senha",
            "Salvando..."
        );

        const { error } =
            await window.supabaseClient.auth.updateUser({
                password
            });

        setButtonLoading(
            button,
            false,
            "Salvar nova senha"
        );

        if (error) {
            console.error(error);
            errorElement.textContent =
                "Não foi possível redefinir a senha. Solicite um novo link e tente novamente.";
            return;
        }

        showToast(
            "Senha redefinida com sucesso!"
        );

        setTimeout(async () => {
            await window.supabaseClient.auth.signOut();
            window.location.href = "index.html";
        }, 1300);
    });
}


/* =========================================================
   PÁGINA PÚBLICA
========================================================= */

async function initUser() {
    const searchInput =
        document.getElementById("searchItem");

    const userItems =
        document.getElementById("userItems");

    const modal =
        document.getElementById("donationModal");

    const closeModalButton =
        document.getElementById("closeDonationModal");

    const donationForm =
        document.getElementById("donationForm");

    const participantForm =
        document.getElementById("participanteForm");

    searchInput?.addEventListener("input", () => {
        renderUserItemsFiltered(searchInput.value);
    });

    userItems?.addEventListener("click", (event) => {
        const button =
            event.target.closest("[data-donate-item]");

        if (!button) {
            return;
        }

        openDonationModal(button.dataset.donateItem);
    });

    closeModalButton?.addEventListener(
        "click",
        closeDonationModal
    );

    modal?.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeDonationModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeDonationModal();
        }
    });

    donationForm?.addEventListener(
        "submit",
        registerDonation
    );

    participantForm?.addEventListener(
        "submit",
        addParticipant
    );

    await refreshUserData();

    startLiveUpdates("user");
}


async function refreshUserData() {
    const [items, participants] =
        await Promise.all([
            fetchItemsWithDonations(),
            fetchParticipants()
        ]);

    currentItems = items;
    currentParticipants = participants;

    renderUserStats(currentItems);

    const search =
        document.getElementById("searchItem")?.value || "";

    renderUserItemsFiltered(search);

    renderParticipantsUser(currentParticipants);
}


function renderUserStats(items) {
    const totalTarget =
        items.reduce(
            (sum, item) => sum + Number(item.meta || 0),
            0
        );

    const totalDonated =
        items.reduce(
            (sum, item) => sum + Number(item.doado || 0),
            0
        );

    const completed =
        items.filter(
            (item) =>
                Number(item.doado) >= Number(item.meta)
        ).length;

    setText("userStatItens", items.length);
    setText("userStatMeta", totalTarget);
    setText("userStatDoado", totalDonated);
    setText("userStatConcluidos", completed);
}


function renderUserItemsFiltered(search = "") {
    const term = search.trim().toLowerCase();

    const filtered =
        !term
            ? currentItems
            : currentItems.filter(
                (item) =>
                    item.nome.toLowerCase().includes(term) ||
                    (item.descricao || "")
                        .toLowerCase()
                        .includes(term)
            );

    renderUserItems(filtered);
}


function renderUserItems(items) {
    const container =
        document.getElementById("userItems");

    if (!container) {
        return;
    }

    if (items.length === 0) {
        container.innerHTML =
            emptyStateHTML(
                "🔎",
                "Nenhum item encontrado",
                "Não encontramos itens disponíveis com essa pesquisa."
            );

        return;
    }

    container.innerHTML =
        items.map(createUserItemCard).join("");
}


function createUserItemCard(item) {
    const percentage = calculatePercentage(item);
    const remaining = getRemaining(item);
    const completed = remaining === 0;

    const lastDonors =
        [...(item.doacoes || [])]
            .sort(
                (a, b) =>
                    new Date(b.data) - new Date(a.data)
            )
            .slice(0, 3);

    const donorHTML =
        lastDonors.length
            ? `
                <div class="donors-preview">
                    <p class="donors-preview-title">
                        PESSOAS QUE JÁ AJUDARAM
                    </p>

                    ${lastDonors
                        .map(
                            (donation) => `
                                <div class="donor-mini">
                                    <span>
                                        ♡ ${escapeHTML(donation.nome)}
                                    </span>

                                    <strong>
                                        ${donation.quantidade}
                                    </strong>
                                </div>
                            `
                        )
                        .join("")}
                </div>
            `
            : "";

    return `
        <article class="item-card ${completed ? "completed" : ""}">
            <div class="item-top">
                <div class="item-icon">📦</div>

                <span class="item-status ${completed ? "completed-status" : ""}">
                    ${completed ? "META ATINGIDA" : "PRECISAMOS"}
                </span>
            </div>

            <h3>${escapeHTML(item.nome)}</h3>

            <p class="item-description">
                ${
                    escapeHTML(item.descricao) ||
                    "Ajude-nos contribuindo com este item."
                }
            </p>

            <div class="progress-info">
                <span>
                    ${
                        completed
                            ? "Meta concluída"
                            : `${remaining} ainda necessário(s)`
                    }
                </span>

                <strong>${percentage}%</strong>
            </div>

            <div class="progress-track">
                <div
                    class="progress-bar"
                    style="width: ${percentage}%"
                ></div>
            </div>

            <div class="item-numbers">
                <div class="item-number">
                    <span>META</span>
                    <strong>${item.meta}</strong>
                </div>

                <div class="item-number">
                    <span>DOADO</span>
                    <strong>${item.doado}</strong>
                </div>

                <div class="item-number">
                    <span>FALTAM</span>
                    <strong>${remaining}</strong>
                </div>
            </div>

            <button
                class="primary-button full-button"
                data-donate-item="${item.id}"
                ${completed ? "disabled" : ""}
            >
                ${
                    completed
                        ? "✓ Meta atingida"
                        : "♡ Quero doar"
                }
            </button>

            ${donorHTML}
        </article>
    `;
}


function openDonationModal(itemId) {
    const item =
        currentItems.find(
            (value) => value.id === itemId
        );

    if (!item) {
        return;
    }

    const remaining = getRemaining(item);

    if (remaining <= 0) {
        showToast("A meta deste item já foi atingida. Obrigado!");
        return;
    }

    const idInput =
        document.getElementById("donationItemId");

    const info =
        document.getElementById("selectedItemInfo");

    const quantityInput =
        document.getElementById("donorQuantity");

    const quantityHelp =
        document.getElementById("quantityHelp");

    const error =
        document.getElementById("donationError");

    idInput.value = item.id;

    info.innerHTML = `
        <strong>📦 ${escapeHTML(item.nome)}</strong>
        <span>
            Ainda precisamos de
            <b>${remaining}</b>
            unidade(s).
        </span>
    `;

    quantityInput.max = remaining;

    quantityHelp.textContent =
        `Quantidade máxima necessária: ${remaining}.`;

    error.textContent = "";

    document
        .getElementById("donationModal")
        .classList.add("show");

    document.body.style.overflow = "hidden";

    setTimeout(() => {
        document.getElementById("donorName")?.focus();
    }, 100);
}


function closeDonationModal() {
    const modal =
        document.getElementById("donationModal");

    const form =
        document.getElementById("donationForm");

    const error =
        document.getElementById("donationError");

    if (!modal) {
        return;
    }

    modal.classList.remove("show");
    document.body.style.overflow = "";

    form?.reset();

    if (error) {
        error.textContent = "";
    }
}


async function registerDonation(event) {
    event.preventDefault();

    const itemId =
        document.getElementById("donationItemId").value;

    const name =
        document.getElementById("donorName").value.trim();

    const quantity =
        Number(document.getElementById("donorQuantity").value);

    const errorElement =
        document.getElementById("donationError");

    const submitButton =
        event.currentTarget.querySelector('button[type="submit"]');

    errorElement.textContent = "";

    if (name.length < 2) {
        errorElement.textContent = "Informe um nome válido.";
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        errorElement.textContent = "Informe uma quantidade válida.";
        return;
    }

    const item =
        currentItems.find(
            (value) => value.id === itemId
        );

    if (!item) {
        errorElement.textContent = "Este item não foi encontrado.";
        return;
    }

    const remaining = getRemaining(item);

    if (quantity > remaining) {
        errorElement.textContent =
            `No momento faltam somente ${remaining} unidade(s).`;

        return;
    }

    setButtonLoading(
        submitButton,
        true,
        "♡ Confirmar minha doação",
        "Registrando..."
    );

    const { error } =
        await window.supabaseClient
            .from("doacoes")
            .insert({
                item_id: itemId,
                nome_doador: name,
                quantidade: quantity
            });

    setButtonLoading(
        submitButton,
        false,
        "♡ Confirmar minha doação"
    );

    if (error) {
        errorElement.textContent =
            friendlyDatabaseError(
                error,
                "Não foi possível registrar a doação. Atualize a página e tente novamente."
            );

        return;
    }

    closeDonationModal();

    await refreshUserData();

    showToast(
        `Obrigado, ${name}! Sua doação de ${quantity} unidade(s) foi registrada. ♡`
    );
}


/* =========================================================
   PARTICIPANTES
========================================================= */

async function addParticipant(event) {
    event.preventDefault();

    const input =
        document.getElementById("participanteNome");

    const errorElement =
        document.getElementById("participanteErro");

    const button =
        event.currentTarget.querySelector('button[type="submit"]');

    const name = input.value.trim();

    errorElement.textContent = "";

    if (name.length < 2) {
        errorElement.textContent = "Digite um nome válido.";
        return;
    }

    setButtonLoading(
        button,
        true,
        "+ Adicionar à lista",
        "Adicionando..."
    );

    const { error } =
        await window.supabaseClient
            .from("participantes")
            .insert({
                nome: name
            });

    setButtonLoading(
        button,
        false,
        "+ Adicionar à lista"
    );

    if (error) {
        errorElement.textContent =
            friendlyDatabaseError(
                error,
                "Não foi possível adicionar o participante."
            );

        return;
    }

    input.value = "";

    await refreshUserData();

    showToast(
        `${name} foi adicionado à lista do Acampamento RENOVO!`
    );

    input.focus();
}


function renderParticipantsUser(participants) {
    const container =
        document.getElementById("listaParticipantes");

    const total =
        document.getElementById("totalParticipantes");

    if (!container || !total) {
        return;
    }

    total.textContent = participants.length;

    if (participants.length === 0) {
        container.innerHTML =
            emptyStateHTML(
                "🙋",
                "Nenhum participante ainda",
                "Seja o primeiro a confirmar presença no Acampamento RENOVO!"
            );

        return;
    }

    container.innerHTML =
        participants
            .map((participant, index) => {
                const initial =
                    escapeHTML(
                        participant.nome
                            .charAt(0)
                            .toUpperCase()
                    );

                return `
                    <div class="participante-row">
                        <div class="participante-numero">
                            ${index + 1}
                        </div>

                        <div class="participante-avatar">
                            ${initial}
                        </div>

                        <div class="participante-info">
                            <strong>
                                ${escapeHTML(participant.nome)}
                            </strong>

                            <span>
                                Presença confirmada
                            </span>
                        </div>
                    </div>
                `;
            })
            .join("");
}


/* =========================================================
   COMPONENTES
========================================================= */

function emptyStateHTML(icon, title, description) {
    return `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>

            <h3>${escapeHTML(title)}</h3>

            <p>${escapeHTML(description)}</p>
        </div>
    `;
}
