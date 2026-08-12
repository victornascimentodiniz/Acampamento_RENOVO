/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const STORAGE_KEY = "campanhaDoacoesItens";

const ADMIN_PASSWORD = "terrao";

let toastTimeout;


/* =========================================================
   BANCO LOCAL
========================================================= */

function getItems() {

    try {

        const dados = localStorage.getItem(STORAGE_KEY);

        if (!dados) {
            return [];
        }

        return JSON.parse(dados);

    } catch (erro) {

        console.error("Erro ao carregar dados:", erro);

        return [];
    }
}


function saveItems(items) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items)
    );
}


/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function createId() {

    if (
        typeof crypto !== "undefined" &&
        crypto.randomUUID
    ) {

        return crypto.randomUUID();
    }

    return (
        Date.now().toString() +
        Math.random().toString(16).slice(2)
    );
}


function escapeHTML(texto) {

    if (!texto) {
        return "";
    }

    return String(texto)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");
}


function formatDate(data) {

    const date = new Date(data);

    return date.toLocaleString(
        "pt-BR",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );
}


function calculatePercentage(item) {

    if (!item.meta) {
        return 0;
    }

    return Math.min(
        100,
        Math.round(
            (item.doado / item.meta) * 100
        )
    );
}


function getRemaining(item) {

    return Math.max(
        0,
        item.meta - item.doado
    );
}


function showToast(message) {

    const toast =
        document.getElementById("toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {

        toast.classList.remove("show");

    }, 3200);
}


/* =========================================================
   IDENTIFICA QUAL PÁGINA ESTÁ ABERTA
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const page =
            document.body.dataset.page;

        if (page === "login") {

            initLogin();
        }

        if (page === "admin") {

            initAdmin();
        }

        if (page === "user") {

            initUser();
        }

    }
);


/* =========================================================
   LOGIN
========================================================= */

function initLogin() {

    const btnUsuario =
        document.getElementById(
            "btnUsuario"
        );

    const btnAdministrador =
        document.getElementById(
            "btnAdministrador"
        );

    const adminLoginBox =
        document.getElementById(
            "adminLoginBox"
        );

    const fecharAdminLogin =
        document.getElementById(
            "fecharAdminLogin"
        );

    const adminLoginForm =
        document.getElementById(
            "adminLoginForm"
        );

    const adminPassword =
        document.getElementById(
            "adminPassword"
        );

    const loginError =
        document.getElementById(
            "loginError"
        );

    const togglePassword =
        document.getElementById(
            "togglePassword"
        );


    /* ENTRAR COMO USUÁRIO */

    btnUsuario.addEventListener(
        "click",
        () => {

            window.location.href =
                "igreja.html";
        }
    );


    /* MOSTRAR LOGIN ADMIN */

    btnAdministrador.addEventListener(
        "click",
        () => {

            adminLoginBox.classList.add(
                "show"
            );

            loginError.textContent = "";

            setTimeout(() => {

                adminPassword.focus();

            }, 100);
        }
    );


    /* FECHAR */

    fecharAdminLogin.addEventListener(
        "click",
        () => {

            adminLoginBox.classList.remove(
                "show"
            );

            adminPassword.value = "";

            loginError.textContent = "";
        }
    );


    /* MOSTRAR / ESCONDER SENHA */

    togglePassword.addEventListener(
        "click",
        () => {

            if (
                adminPassword.type ===
                "password"
            ) {

                adminPassword.type =
                    "text";

                togglePassword.textContent =
                    "Ocultar";

            } else {

                adminPassword.type =
                    "password";

                togglePassword.textContent =
                    "Mostrar";
            }

        }
    );


    /* VALIDAR SENHA */

    adminLoginForm.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

            const senha =
                adminPassword.value.trim();

            if (
                senha ===
                ADMIN_PASSWORD
            ) {

                sessionStorage.setItem(
                    "adminAutenticado",
                    "true"
                );

                window.location.href =
                    "administrador.html";

            } else {

                loginError.textContent =
                    "Senha incorreta. Tente novamente.";

                adminPassword.select();
            }

        }
    );
}


/* =========================================================
   ADMINISTRADOR
========================================================= */

function initAdmin() {

    /* PROTEÇÃO SIMPLES */

    const autenticado =
        sessionStorage.getItem(
            "adminAutenticado"
        );

    if (
        autenticado !== "true"
    ) {

        window.location.href =
            "index.html";

        return;
    }


    const itemForm =
        document.getElementById(
            "itemForm"
        );

    const adminItems =
        document.getElementById(
            "adminItems"
        );

    const logoutAdmin =
        document.getElementById(
            "logoutAdmin"
        );

    const limparTodos =
        document.getElementById(
            "limparTodos"
        );


    /* CADASTRAR ITEM */

    itemForm.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

            const nome =
                document
                    .getElementById(
                        "itemNome"
                    )
                    .value
                    .trim();

            const descricao =
                document
                    .getElementById(
                        "itemDescricao"
                    )
                    .value
                    .trim();

            const quantidade =
                Number(
                    document
                        .getElementById(
                            "itemQuantidade"
                        )
                        .value
                );


            if (
                !nome ||
                quantidade <= 0
            ) {

                showToast(
                    "Preencha corretamente os dados do item."
                );

                return;
            }


            const items =
                getItems();


            const novoItem = {

                id: createId(),

                nome: nome,

                descricao: descricao,

                meta: quantidade,

                doado: 0,

                criadoEm:
                    new Date().toISOString(),

                doacoes: []
            };


            items.unshift(
                novoItem
            );


            saveItems(items);


            itemForm.reset();


            renderAdmin();


            showToast(
                "Item adicionado com sucesso!"
            );

        }
    );


    /* EXCLUIR ITEM */

    adminItems.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "[data-delete-item]"
                );

            if (!button) {
                return;
            }


            const id =
                button.dataset.deleteItem;


            const items =
                getItems();


            const item =
                items.find(
                    item =>
                        item.id === id
                );


            if (!item) {
                return;
            }


            const confirmar =
                confirm(
                    `Deseja realmente excluir "${item.nome}"? Todas as doações registradas neste item também serão excluídas.`
                );


            if (!confirmar) {
                return;
            }


            const novosItems =
                items.filter(
                    item =>
                        item.id !== id
                );


            saveItems(
                novosItems
            );


            renderAdmin();


            showToast(
                "Item excluído."
            );

        }
    );


    /* LIMPAR TODOS */

    limparTodos.addEventListener(
        "click",
        () => {

            const items =
                getItems();


            if (
                items.length === 0
            ) {

                showToast(
                    "Não existem itens para excluir."
                );

                return;
            }


            const confirmar =
                confirm(
                    "Tem certeza que deseja apagar TODOS os itens e todas as doações?"
                );


            if (!confirmar) {
                return;
            }


            localStorage.removeItem(
                STORAGE_KEY
            );


            renderAdmin();


            showToast(
                "Todos os dados foram removidos."
            );

        }
    );


    /* LOGOUT */

    logoutAdmin.addEventListener(
        "click",
        () => {

            sessionStorage.removeItem(
                "adminAutenticado"
            );

            window.location.href =
                "index.html";

        }
    );


    renderAdmin();
}


/* =========================================================
   RENDER ADMIN
========================================================= */

function renderAdmin() {

    const items =
        getItems();


    renderAdminStats(
        items
    );


    renderAdminItems(
        items
    );


    renderDonationHistory(
        items
    );
}


/* =========================================================
   ESTATÍSTICAS ADMIN
========================================================= */

function renderAdminStats(items) {

    const totalItens =
        items.length;


    const metaTotal =
        items.reduce(
            (total, item) =>
                total +
                Number(item.meta || 0),
            0
        );


    const totalDoado =
        items.reduce(
            (total, item) =>
                total +
                Number(item.doado || 0),
            0
        );


    const concluidos =
        items.filter(
            item =>
                item.doado >=
                item.meta
        ).length;


    document.getElementById(
        "statItens"
    ).textContent =
        totalItens;


    document.getElementById(
        "statMeta"
    ).textContent =
        metaTotal;


    document.getElementById(
        "statDoado"
    ).textContent =
        totalDoado;


    document.getElementById(
        "statConcluidos"
    ).textContent =
        concluidos;
}


/* =========================================================
   CARDS ADMIN
========================================================= */

function renderAdminItems(items) {

    const container =
        document.getElementById(
            "adminItems"
        );


    if (!container) {
        return;
    }


    if (
        items.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    📦
                </div>

                <h3>
                    Nenhum item cadastrado
                </h3>

                <p>
                    Utilize o formulário acima para adicionar o primeiro item da campanha.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        items.map(
            item =>
                createAdminItemCard(
                    item
                )
        ).join("");
}


/* =========================================================
   CRIAR CARD ADMIN
========================================================= */

function createAdminItemCard(item) {

    const percentual =
        calculatePercentage(item);


    const restante =
        getRemaining(item);


    const concluido =
        restante === 0;


    const ultimosDoadores =
        (item.doacoes || [])
            .slice()
            .reverse()
            .slice(0, 3);


    let doadoresHTML = "";


    if (
        ultimosDoadores.length > 0
    ) {

        doadoresHTML = `

            <div class="donors-preview">

                <p class="donors-preview-title">
                    ÚLTIMOS DOADORES
                </p>

                ${ultimosDoadores
                    .map(
                        doacao => `

                            <div class="donor-mini">

                                <span>
                                    ${escapeHTML(
                                        doacao.nome
                                    )}
                                </span>

                                <strong>
                                    +${doacao.quantidade}
                                </strong>

                            </div>

                        `
                    )
                    .join("")}

            </div>
        `;
    }


    return `

        <article
            class="item-card
            ${concluido ? "completed" : ""}"
        >

            <div class="item-top">

                <div class="item-icon">
                    📦
                </div>

                <span
                    class="item-status
                    ${concluido
                        ? "completed-status"
                        : ""}"
                >

                    ${concluido
                        ? "META ATINGIDA"
                        : "EM ANDAMENTO"}

                </span>

            </div>


            <h3>
                ${escapeHTML(item.nome)}
            </h3>


            <p class="item-description">

                ${
                    escapeHTML(
                        item.descricao
                    ) ||
                    "Item necessário para nossa campanha."
                }

            </p>


            <div class="progress-info">

                <span>
                    Progresso
                </span>

                <strong>
                    ${percentual}%
                </strong>

            </div>


            <div class="progress-track">

                <div
                    class="progress-bar"
                    style="
                        width:
                        ${percentual}%
                    "
                >
                </div>

            </div>


            <div class="item-numbers">

                <div class="item-number">

                    <span>
                        META
                    </span>

                    <strong>
                        ${item.meta}
                    </strong>

                </div>


                <div class="item-number">

                    <span>
                        DOADO
                    </span>

                    <strong>
                        ${item.doado}
                    </strong>

                </div>


                <div class="item-number">

                    <span>
                        FALTAM
                    </span>

                    <strong>
                        ${restante}
                    </strong>

                </div>

            </div>


            ${doadoresHTML}


            <div
                class="item-actions"
                style="margin-top: 16px;"
            >

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


/* =========================================================
   HISTÓRICO ADMIN
========================================================= */

function renderDonationHistory(items) {

    const container =
        document.getElementById(
            "donationHistory"
        );


    if (!container) {
        return;
    }


    const historico = [];


    items.forEach(
        item => {

            (item.doacoes || [])
                .forEach(
                    doacao => {

                        historico.push({

                            ...doacao,

                            itemNome:
                                item.nome
                        });

                    }
                );

        }
    );


    historico.sort(
        (a, b) =>
            new Date(b.data) -
            new Date(a.data)
    );


    if (
        historico.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ❤
                </div>

                <h3>
                    Nenhuma doação ainda
                </h3>

                <p>
                    Quando alguém registrar uma doação ela aparecerá aqui.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        historico
            .slice(0, 30)
            .map(
                doacao => {

                    const inicial =
                        escapeHTML(
                            doacao.nome
                                .charAt(0)
                                .toUpperCase()
                        );


                    return `

                        <div class="history-row">

                            <div class="history-avatar">
                                ${inicial}
                            </div>

                            <div class="history-person">

                                <strong>
                                    ${escapeHTML(
                                        doacao.nome
                                    )}
                                </strong>

                                <span>
                                    ${formatDate(
                                        doacao.data
                                    )}
                                </span>

                            </div>

                            <div class="history-item">
                                ${escapeHTML(
                                    doacao.itemNome
                                )}
                            </div>

                            <span class="history-quantity">
                                +${doacao.quantidade}
                            </span>

                        </div>

                    `;

                }
            )
            .join("");
}


/* =========================================================
   USUÁRIO
========================================================= */

function initUser() {

    const searchInput =
        document.getElementById(
            "searchItem"
        );

    const userItems =
        document.getElementById(
            "userItems"
        );

    const modal =
        document.getElementById(
            "donationModal"
        );

    const closeModal =
        document.getElementById(
            "closeDonationModal"
        );

    const donationForm =
        document.getElementById(
            "donationForm"
        );


    /* PESQUISA */

    searchInput.addEventListener(
        "input",
        () => {

            renderUser(
                searchInput.value
            );

        }
    );


    /* ABRIR MODAL */

    userItems.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "[data-donate-item]"
                );

            if (!button) {
                return;
            }


            openDonationModal(
                button.dataset.donateItem
            );

        }
    );


    /* FECHAR MODAL */

    closeModal.addEventListener(
        "click",
        closeDonationModal
    );


    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modal
            ) {

                closeDonationModal();
            }

        }
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape"
            ) {

                closeDonationModal();
            }

        }
    );


    /* REGISTRAR DOAÇÃO */

    donationForm.addEventListener(
        "submit",
        registerDonation
    );


    renderUser();
}


/* =========================================================
   RENDER USUÁRIO
========================================================= */

function renderUser(search = "") {

    const items =
        getItems();


    renderUserStats(
        items
    );


    let filteredItems =
        items;


    if (
        search.trim()
    ) {

        const termo =
            search
                .trim()
                .toLowerCase();


        filteredItems =
            items.filter(
                item =>

                    item.nome
                        .toLowerCase()
                        .includes(termo)

                    ||

                    (
                        item.descricao || ""
                    )
                        .toLowerCase()
                        .includes(termo)
            );
    }


    renderUserItems(
        filteredItems
    );
}


/* =========================================================
   ESTATÍSTICAS USUÁRIO
========================================================= */

function renderUserStats(items) {

    const meta =
        items.reduce(
            (total, item) =>
                total +
                Number(item.meta || 0),
            0
        );


    const doado =
        items.reduce(
            (total, item) =>
                total +
                Number(item.doado || 0),
            0
        );


    const concluidos =
        items.filter(
            item =>
                item.doado >=
                item.meta
        ).length;


    document.getElementById(
        "userStatItens"
    ).textContent =
        items.length;


    document.getElementById(
        "userStatMeta"
    ).textContent =
        meta;


    document.getElementById(
        "userStatDoado"
    ).textContent =
        doado;


    document.getElementById(
        "userStatConcluidos"
    ).textContent =
        concluidos;
}


/* =========================================================
   CARDS USUÁRIO
========================================================= */

function renderUserItems(items) {

    const container =
        document.getElementById(
            "userItems"
        );


    if (!container) {
        return;
    }


    if (
        items.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    🔎
                </div>

                <h3>
                    Nenhum item encontrado
                </h3>

                <p>
                    No momento não encontramos itens disponíveis com essa pesquisa.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        items.map(
            item =>
                createUserItemCard(
                    item
                )
        ).join("");
}


/* =========================================================
   CRIAR CARD DO USUÁRIO
========================================================= */

function createUserItemCard(item) {

    const percentual =
        calculatePercentage(item);


    const restante =
        getRemaining(item);


    const concluido =
        restante === 0;


    const ultimosDoadores =
        (item.doacoes || [])
            .slice()
            .reverse()
            .slice(0, 3);


    let doadoresHTML = "";


    if (
        ultimosDoadores.length
    ) {

        doadoresHTML = `

            <div class="donors-preview">

                <p class="donors-preview-title">
                    PESSOAS QUE JÁ AJUDARAM
                </p>

                ${ultimosDoadores
                    .map(
                        doacao => `

                        <div class="donor-mini">

                            <span>
                                ❤
                                ${escapeHTML(
                                    doacao.nome
                                )}
                            </span>

                            <strong>
                                ${doacao.quantidade}
                            </strong>

                        </div>

                        `
                    )
                    .join("")}

            </div>

        `;
    }


    return `

        <article
            class="item-card
            ${concluido ? "completed" : ""}"
        >

            <div class="item-top">

                <div class="item-icon">
                    📦
                </div>

                <span
                    class="item-status
                    ${
                        concluido
                            ? "completed-status"
                            : ""
                    }"
                >

                    ${
                        concluido
                            ? "META ATINGIDA"
                            : "PRECISAMOS"
                    }

                </span>

            </div>


            <h3>
                ${escapeHTML(
                    item.nome
                )}
            </h3>


            <p class="item-description">

                ${
                    escapeHTML(
                        item.descricao
                    )

                    ||

                    "Ajude-nos contribuindo com este item."
                }

            </p>


            <div class="progress-info">

                <span>
                    ${
                        concluido
                            ? "Meta concluída"
                            : `${restante} ainda necessário(s)`
                    }
                </span>

                <strong>
                    ${percentual}%
                </strong>

            </div>


            <div class="progress-track">

                <div
                    class="progress-bar"
                    style="
                        width:
                        ${percentual}%;
                    "
                >
                </div>

            </div>


            <div class="item-numbers">

                <div class="item-number">

                    <span>
                        META
                    </span>

                    <strong>
                        ${item.meta}
                    </strong>

                </div>


                <div class="item-number">

                    <span>
                        DOADO
                    </span>

                    <strong>
                        ${item.doado}
                    </strong>

                </div>


                <div class="item-number">

                    <span>
                        FALTAM
                    </span>

                    <strong>
                        ${restante}
                    </strong>

                </div>

            </div>


            <button
                class="primary-button full-button"
                data-donate-item="${item.id}"
                ${concluido ? "disabled" : ""}
            >

                ${
                    concluido
                        ? "✓ Meta atingida"
                        : "❤ Quero doar"
                }

            </button>


            ${doadoresHTML}

        </article>
    `;
}


/* =========================================================
   ABRIR MODAL DE DOAÇÃO
========================================================= */

function openDonationModal(itemId) {

    const items =
        getItems();


    const item =
        items.find(
            item =>
                item.id === itemId
        );


    if (!item) {
        return;
    }


    const restante =
        getRemaining(item);


    if (
        restante <= 0
    ) {

        showToast(
            "A meta deste item já foi atingida. Obrigado!"
        );

        return;
    }


    document.getElementById(
        "donationItemId"
    ).value =
        item.id;


    document.getElementById(
        "selectedItemInfo"
    ).innerHTML = `

        <strong>
            📦 ${escapeHTML(item.nome)}
        </strong>

        <span>
            Ainda precisamos de
            <b>${restante}</b>
            unidade(s).
        </span>

    `;


    const quantidadeInput =
        document.getElementById(
            "donorQuantity"
        );


    quantidadeInput.max =
        restante;


    document.getElementById(
        "quantityHelp"
    ).textContent =
        `Quantidade máxima necessária: ${restante}.`;


    document.getElementById(
        "donationError"
    ).textContent = "";


    document.getElementById(
        "donationModal"
    ).classList.add(
        "show"
    );


    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => {

            document.getElementById(
                "donorName"
            ).focus();

        },
        100
    );
}


/* =========================================================
   FECHAR MODAL
========================================================= */

function closeDonationModal() {

    const modal =
        document.getElementById(
            "donationModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    document.body.style.overflow =
        "";


    const form =
        document.getElementById(
            "donationForm"
        );


    if (form) {
        form.reset();
    }


    const error =
        document.getElementById(
            "donationError"
        );


    if (error) {
        error.textContent = "";
    }
}


/* =========================================================
   REGISTRAR DOAÇÃO
========================================================= */

function registerDonation(event) {

    event.preventDefault();


    const itemId =
        document.getElementById(
            "donationItemId"
        ).value;


    const nome =
        document.getElementById(
            "donorName"
        )
            .value
            .trim();


    const quantidade =
        Number(
            document.getElementById(
                "donorQuantity"
            ).value
        );


    const error =
        document.getElementById(
            "donationError"
        );


    error.textContent = "";


    if (!nome) {

        error.textContent =
            "Informe seu nome.";

        return;
    }


    if (
        !Number.isInteger(
            quantidade
        )
        ||
        quantidade <= 0
    ) {

        error.textContent =
            "Informe uma quantidade válida.";

        return;
    }


    const items =
        getItems();


    const itemIndex =
        items.findIndex(
            item =>
                item.id === itemId
        );


    if (
        itemIndex === -1
    ) {

        error.textContent =
            "Este item não foi encontrado.";

        return;
    }


    const item =
        items[itemIndex];


    const restante =
        getRemaining(item);


    if (
        quantidade >
        restante
    ) {

        error.textContent =
            `Ainda precisamos somente de ${restante} unidade(s).`;

        return;
    }


    const novaDoacao = {

        id: createId(),

        nome: nome,

        quantidade: quantidade,

        data:
            new Date().toISOString()
    };


    if (
        !Array.isArray(
            item.doacoes
        )
    ) {

        item.doacoes = [];
    }


    item.doacoes.push(
        novaDoacao
    );


    item.doado =
        Number(
            item.doado || 0
        )
        +
        quantidade;


    items[itemIndex] =
        item;


    saveItems(
        items
    );


    closeDonationModal();


    const search =
        document.getElementById(
            "searchItem"
        ).value;


    renderUser(
        search
    );


    showToast(
        `Obrigado, ${nome}! Sua doação de ${quantidade} unidade(s) foi registrada. ❤`
    );
}
