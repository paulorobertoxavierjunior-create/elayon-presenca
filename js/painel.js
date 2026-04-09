(function () {
  const supabase = window.ELAYON_SUPABASE || null;
  const cfg = window.ELAYON_CONFIG || {};

  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const systemStatus = document.getElementById("systemStatus");
  const accessStatus = document.getElementById("accessStatus");
  const evaluationText = document.getElementById("evaluationText");
  const lionToolsText = document.getElementById("lionToolsText");
  const lionToolsCard = document.getElementById("lionToolsCard");

  const btnIniciarAvaliacao = document.getElementById("btnIniciarAvaliacao");
  const btnAbrirOperador = document.getElementById("btnAbrirOperador");
  const btnSimularAprovacao = document.getElementById("btnSimularAprovacao");
  const btnLogout = document.getElementById("btnLogout");

  const btnFalaLivre = document.getElementById("btnFalaLivre");
  const btnTreinamentoVocal = document.getElementById("btnTreinamentoVocal");
  const btnRelatorioLion = document.getElementById("btnRelatorioLion");

  const btnToggleLogs = document.getElementById("btnToggleLogs");
  const btnLimparLogs = document.getElementById("btnLimparLogs");
  const logsPanel = document.getElementById("logsPanel");
  const logBox = document.getElementById("logBox");

  const ACCESS_KEY = "elayon_operator_access";

  function log(msg) {
    const t = new Date().toLocaleTimeString("pt-BR");
    logBox.textContent += `[${t}] ${msg}\n`;
    logBox.scrollTop = logBox.scrollHeight;
  }

  function setLionLocked(locked) {
    btnFalaLivre.disabled = locked;
    btnTreinamentoVocal.disabled = locked;
    btnRelatorioLion.disabled = locked;

    if (locked) {
      accessStatus.textContent = "Pendente de avaliação";
      evaluationText.textContent =
        "O acesso às ferramentas Lion será liberado após a conclusão da avaliação inicial.";
      lionToolsText.textContent =
        "Ainda bloqueadas. Conclua a avaliação obrigatória para liberar o uso autodidata.";
      lionToolsCard.classList.add("lion-locked");
      log("ferramentas Lion mantidas bloqueadas");
    } else {
      accessStatus.textContent = "Apto para seguir";
      evaluationText.textContent =
        "Avaliação inicial concluída. O uso autodidata foi liberado.";
      lionToolsText.textContent =
        "Ferramentas Lion liberadas para este operador.";
      lionToolsCard.classList.remove("lion-locked");
      log("ferramentas Lion liberadas");
    }
  }

  function saveOperatorAccess(value) {
    localStorage.setItem(ACCESS_KEY, JSON.stringify({
      approved: value,
      updatedAt: new Date().toISOString()
    }));
  }

  function loadOperatorAccess() {
    try {
      return JSON.parse(localStorage.getItem(ACCESS_KEY) || "null");
    } catch {
      return null;
    }
  }

  async function hydrateUser() {
    if (!supabase) {
      userName.textContent = "Supabase não conectado";
      userEmail.textContent = "Supabase não conectado";
      systemStatus.textContent = "OFF";
      log("ERRO: Supabase não conectado no painel");
      return;
    }

    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      log("ERRO: usuário não autenticado no painel");
      window.location.href = "login.html";
      return;
    }

    const user = data.user;
    const nome = user.user_metadata?.nome || "Usuário";
    userName.textContent = nome;
    userEmail.textContent = user.email || "—";
    systemStatus.textContent = "ON";
    log(`usuário carregado: ${nome} <${user.email}>`);
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

    btnSimularAprovacao.addEventListener("click", () => {
      log("simulação de aprovação acionada");
      saveOperatorAccess(true);
      setLionLocked(false);
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