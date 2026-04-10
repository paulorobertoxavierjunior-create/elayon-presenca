(function () {
  const supabase = window.ELAYON_SUPABASE || null;

  const ACCESS_KEY = "elayon_operator_access";
  // Já deixei evidente no código:
  // esta chave guarda a aprovação temporária do operador.
  // Quando approved = true, as ferramentas Lion são liberadas no painel.

  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const systemStatus = document.getElementById("systemStatus");
  const accessStatus = document.getElementById("accessStatus");
  const lastState = document.getElementById("lastState");
  const lionToolsText = document.getElementById("lionToolsText");
  const lionToolsCard = document.getElementById("lionToolsCard");

  const btnIniciarAvaliacao = document.getElementById("btnIniciarAvaliacao");
  const btnAbrirOperador = document.getElementById("btnAbrirOperador");
  const btnLogout = document.getElementById("btnLogout");

  const btnFalaLivre = document.getElementById("btnFalaLivre");
  const btnTreinamentoVocal = document.getElementById("btnTreinamentoVocal");
  const btnRelatorioLion = document.getElementById("btnRelatorioLion");

  const btnToggleLogs = document.getElementById("btnToggleLogs");
  const btnLimparLogs = document.getElementById("btnLimparLogs");
  const logsPanel = document.getElementById("logsPanel");
  const logBox = document.getElementById("logBox");

  function log(msg) {
    const t = new Date().toLocaleTimeString("pt-BR");
    logBox.textContent += `[${t}] ${msg}\n`;
    logBox.scrollTop = logBox.scrollHeight;
  }

  function loadOperatorAccess() {
    try {
      return JSON.parse(localStorage.getItem(ACCESS_KEY) || "null");
    } catch {
      return null;
    }
  }

  function setLionLocked(locked) {
    btnFalaLivre.disabled = locked;
    btnTreinamentoVocal.disabled = locked;
    btnRelatorioLion.disabled = locked;

    if (locked) {
      accessStatus.textContent = "Pendente de avaliação";
      lastState.textContent = "Aguardando primeira conferência";
      lionToolsText.textContent =
        "Ainda bloqueadas. O acesso será liberado após a conclusão da avaliação obrigatória.";
      lionToolsCard.classList.add("lion-locked");
      log("ferramentas Lion mantidas bloqueadas");
    } else {
      accessStatus.textContent = "Apto para seguir";
      lastState.textContent = "Operador aprovado para uso";
      lionToolsText.textContent =
        "Ferramentas Lion liberadas para este usuário.";
      lionToolsCard.classList.remove("lion-locked");
      log("ferramentas Lion liberadas");
    }
  }

  async function hydrateUser() {
    if (!supabase) {
      systemStatus.textContent = "OFF";
      userName.textContent = "Supabase não conectado";
      userEmail.textContent = "Supabase não conectado";
      log("ERRO: Supabase não conectado");
      return;
    }

    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      log("ERRO: usuário não autenticado");
      window.location.href = "login.html";
      return;
    }

    const user = data.user;
    userName.textContent = user.user_metadata?.nome || "Usuário";
    userEmail.textContent = user.email || "—";
    systemStatus.textContent = "ON";
    log(`usuário carregado: ${user.email}`);
  }

  function bindActions() {
    btnIniciarAvaliacao.addEventListener("click", () => {
      log("botão iniciar avaliação acionado");
      window.location.href = "operador-teste.html";
    });

    btnAbrirOperador.addEventListener("click", () => {
      log("abrindo teste do operador");
      window.location.href = "operador-teste.html";
    });

    btnLogout.addEventListener("click", async () => {
      log("logout solicitado");
      if (supabase) {
        await supabase.auth.signOut();
      }
      window.location.href = "login.html";
    });

    btnFalaLivre.addEventListener("click", () => {
      log("fala livre acionada");
      alert("Fala livre será ligada na próxima etapa.");
    });

    btnTreinamentoVocal.addEventListener("click", () => {
      log("treinamento vocal acionado");
      alert("Treinamento vocal será ligado na próxima etapa.");
    });

    btnRelatorioLion.addEventListener("click", () => {
      log("relatório Lion acionado");
      window.location.href = "relatorio-lion.html";
    });

    btnToggleLogs.addEventListener("click", () => {
      const hidden = logsPanel.style.display === "none";
      logsPanel.style.display = hidden ? "block" : "none";
      btnToggleLogs.textContent = hidden ? "Ocultar logs" : "Mostrar logs";
      log(hidden ? "logs exibidos" : "logs ocultados");
    });

    btnLimparLogs.addEventListener("click", () => {
      logBox.textContent = "";
      log("logs limpos");
    });
  }

  async function init() {
    log("painel iniciado");
    await hydrateUser();

    const access = loadOperatorAccess();
    setLionLocked(!(access && access.approved));

    bindActions();
    log("painel pronto");
  }

  init();
})();