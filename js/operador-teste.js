(function () {
  const supabase = window.ELAYON_SUPABASE || null;

  const ACCESS_KEY = "elayon_operator_access";
  // Já deixei evidente no código:
  // esta chave controla a aprovação do operador e a liberação do painel.

  const btnStartOperator = document.getElementById("btnStartOperator");
  const btnStopOperator = document.getElementById("btnStopOperator");

  const btnConfirmAndFollow = document.getElementById("btnConfirmAndFollow");
  const btnRedoOperator = document.getElementById("btnRedoOperator");
  const btnPsiQ = document.getElementById("btnPsiQ");
  const btnHealth = document.getElementById("btnHealth");
  const btnHelp = document.getElementById("btnHelp");

  const btnToggleLogs = document.getElementById("btnToggleLogs");
  const btnClearLogs = document.getElementById("btnClearLogs");

  const logsPanel = document.getElementById("logsPanel");
  const logBox = document.getElementById("logBox");

  const operatorSystemStatus = document.getElementById("operatorSystemStatus");
  const operatorCurrentStep = document.getElementById("operatorCurrentStep");
  const operatorMicStatus = document.getElementById("operatorMicStatus");
  const operatorInstruction = document.getElementById("operatorInstruction");
  const operatorTranscript = document.getElementById("operatorTranscript");
  const operatorReading = document.getElementById("operatorReading");

  let recognition = null;
  let currentStep = 0;
  let isRunning = false;
  let isSpeaking = false;
  let sessionTexts = ["", "", ""];
  let speechAvailable = false;
  let speechSynthesisAvailable = "speechSynthesis" in window;
  let lastError = null;

  function log(msg) {
    const t = new Date().toLocaleTimeString("pt-BR");
    logBox.textContent += `[${t}] ${msg}\n`;
    logBox.scrollTop = logBox.scrollHeight;
    console.log("[OPERADOR]", msg);
  }

  function logError(context, error) {
    const msg = error?.message || error?.error || String(error || "erro desconhecido");
    lastError = msg;
    log(`ERRO ${context}: ${msg}`);
  }

  function showUserError(text) {
    operatorInstruction.textContent = text;
    operatorSystemStatus.textContent = "Erro controlado";
  }

  function setAccessApproved(value) {
    localStorage.setItem(
      ACCESS_KEY,
      JSON.stringify({
        approved: value,
        updatedAt: new Date().toISOString()
      })
    );
    log(`aprovação gravada: ${value}`);
  }

  function enableFinalCommands(enabled) {
    btnConfirmAndFollow.disabled = !enabled;
    btnRedoOperator.disabled = !enabled;
    btnPsiQ.disabled = !enabled;
    btnHealth.disabled = !enabled;
    btnHelp.disabled = !enabled;
  }

  function getGreetingByHour() {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  function buildStepInstruction(step) {
    const greeting = getGreetingByHour();

    if (step === 1) {
      return `${greeting}. Tudo certo pra começar? Diga seu nome e como você chega para esta atividade.`;
    }
    if (step === 2) {
      return "Segunda etapa. Diga o que você precisa fazer agora, em poucas palavras.";
    }
    if (step === 3) {
      return "Terceira etapa. Conte de um a dez em ritmo natural.";
    }
    return "Etapa não definida.";
  }

  function buildHeuristicReading() {
    const text1 = (sessionTexts[0] || "").trim();
    const text2 = (sessionTexts[1] || "").trim();
    const text3 = (sessionTexts[2] || "").trim();

    const totalChars = text1.length + text2.length + text3.length;
    const emptyCount = [text1, text2, text3].filter(t => !t).length;

    if (emptyCount >= 2) {
      return "Baixa resposta captada. Vale refazer com mais presença e calma.";
    }

    if (totalChars < 40) {
      return "Resposta curta, com baixa sustentação. O operador pode tentar novamente com mais continuidade.";
    }

    return "Boa resposta inicial. Há sinal suficiente para seguir à próxima etapa do sistema.";
  }

  function resetOperatorState() {
    currentStep = 0;
    isRunning = false;
    isSpeaking = false;
    sessionTexts = ["", "", ""];
    lastError = null;

    operatorSystemStatus.textContent = "Aguardando";
    operatorCurrentStep.textContent = "Nenhuma";
    operatorMicStatus.textContent = "Desligado";
    operatorInstruction.textContent = "Inicie a avaliação para começar a conferência do operador.";
    operatorTranscript.textContent = "Nenhuma fala captada ainda.";
    operatorReading.textContent = "A leitura será consolidada após as 3 etapas.";
    enableFinalCommands(false);

    try {
      if (recognition) recognition.abort();
    } catch {}

    if (speechSynthesisAvailable) {
      window.speechSynthesis.cancel();
    }

    log("estado do operador resetado");
  }

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        log("bip indisponível neste navegador");
        return;
      }

      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.05;

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.18);

      osc.onended = () => ctx.close();
      log("bip emitido");
    } catch (error) {
      logError("bip", error);
    }
  }

  function safeSpeak(text) {
    return new Promise((resolve) => {
      if (!speechSynthesisAvailable) {
        log("speechSynthesis indisponível");
        resolve(false);
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "pt-BR";
        utter.rate = 1;
        utter.pitch = 1;
        utter.volume = 1;

        utter.onstart = () => {
          isSpeaking = true;
          operatorSystemStatus.textContent = "Falando";
          log(`tts iniciou: ${text}`);
        };

        utter.onend = () => {
          isSpeaking = false;
          operatorSystemStatus