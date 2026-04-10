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
          operatorSystemStatus.textContent = "Aguardando resposta";
          log("tts finalizou");
          resolve(true);
        };

        utter.onerror = (event) => {
          isSpeaking = false;
          logError("tts", event.error || event);
          resolve(false);
        };

        window.speechSynthesis.speak(utter);
      } catch (error) {
        isSpeaking = false;
        logError("safeSpeak", error);
        resolve(false);
      }
    });
  }

  function createRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      speechAvailable = false;
      log("speech recognition indisponível");
      return null;
    }

    speechAvailable = true;

    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      operatorMicStatus.textContent = "Ligado";
      operatorSystemStatus.textContent = "Ouvindo";
      log("speech recognition iniciou");
    };

    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      log(`speech recognition recebeu: ${transcript || "[vazio]"}`);
      handleStepResult(transcript);
    };

    rec.onerror = (event) => {
      logError("speech recognition", event.error || event);
      operatorMicStatus.textContent = "Erro";
      operatorSystemStatus.textContent = "Erro na escuta";
      showUserError("Não foi possível captar sua fala com clareza. Você pode refazer.");
      enableFinalCommands(true);
    };

    rec.onend = () => {
      operatorMicStatus.textContent = "Desligado";
      if (isRunning) {
        log("speech recognition encerrou");
      }
    };

    return rec;
  }

  function safeListen() {
    return new Promise((resolve) => {
      if (!recognition) {
        recognition = createRecognition();
      }

      if (!recognition) {
        showUserError("Reconhecimento de fala não disponível neste navegador.");
        resolve(false);
        return;
      }

      try {
        recognition.start();
        log("escuta iniciada");
        resolve(true);
      } catch (error) {
        logError("safeListen", error);
        showUserError("Não foi possível iniciar o microfone. Verifique a permissão e tente novamente.");
        resolve(false);
      }
    });
  }

  async function advanceToStep(step) {
    currentStep = step;
    operatorCurrentStep.textContent = `${step} de 3`;

    const instruction = buildStepInstruction(step);
    operatorInstruction.textContent = instruction;
    operatorTranscript.textContent = `Aguardando resposta da etapa ${step}...`;

    const spoke = await safeSpeak(instruction);

    if (!spoke) {
      showUserError("Falha ao emitir a instrução por voz. Você pode refazer.");
      enableFinalCommands(true);
      return;
    }

    setTimeout(async () => {
      beep();
      await safeListen();
    }, 350);
  }

  function finishOperatorTest() {
    isRunning = false;
    operatorSystemStatus.textContent = "Concluído";
    operatorCurrentStep.textContent = "3 de 3";
    operatorMicStatus.textContent = "Desligado";

    const reading = buildHeuristicReading();
    operatorReading.textContent = reading;
    operatorInstruction.textContent = "Avaliação concluída. Escolha como deseja seguir.";

    enableFinalCommands(true);

    log("3 etapas concluídas");
    log(`leitura final: ${reading}`);

    safeSpeak("Avaliação concluída. Escolha como deseja seguir. Obrigado pela sua presença no sistema Elayon.");
  }

  async function handleStepResult(transcript) {
    sessionTexts[currentStep - 1] = transcript || "";
    operatorTranscript.textContent = transcript || "Sem resposta captada.";
    log(`texto captado na etapa ${currentStep}: ${transcript || "[vazio]"}`);

    if (!transcript || transcript.length < 2) {
      showUserError("Resposta muito curta ou não captada. Você pode refazer esta avaliação.");
      enableFinalCommands(true);
      return;
    }

    if (currentStep >= 3) {
      finishOperatorTest();
      return;
    }

    await advanceToStep(currentStep + 1);
  }

  async function startOperatorFlow() {
    resetOperatorState();

    isRunning = true;
    operatorSystemStatus.textContent = "Iniciando";
    log("fluxo do operador iniciado");
    log(`speech available: ${speechAvailable}`);
    log(`speechSynthesis available: ${speechSynthesisAvailable}`);

    await advanceToStep(1);
  }

  function stopOperatorFlow() {
    isRunning = false;

    try {
      if (recognition) recognition.abort();
    } catch {}

    if (speechSynthesisAvailable) {
      window.speechSynthesis.cancel();
    }

    operatorSystemStatus.textContent = "Parado";
    operatorMicStatus.textContent = "Desligado";
    operatorInstruction.textContent = "Interação interrompida. Você pode reiniciar quando quiser.";

    log("interação parada manualmente");
  }

  async function hydrateUserContext() {
    if (!supabase) {
      log("ERRO: Supabase não conectado");
      return;
    }

    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      log("ERRO: usuário não autenticado");
      window.location.href = "login.html";
      return;
    }

    log(`usuário autenticado: ${data.user.email}`);
  }

  btnStartOperator.addEventListener("click", async () => {
    await startOperatorFlow();
  });

  btnStopOperator.addEventListener("click", () => {
    stopOperatorFlow();
  });

  btnConfirmAndFollow.addEventListener("click", () => {
    setAccessApproved(true);
    log("usuário aprovado manualmente para seguir");
    window.location.href = "painel.html";
  });

  btnRedoOperator.addEventListener("click", async () => {
    log("usuário escolheu refazer");
    await startOperatorFlow();
  });

  btnPsiQ.addEventListener("click", () => {
    log("encaminhamento PsiQ acionado");
    alert("Encaminhamento para Elayon PsiQ.");
  });

  btnHealth.addEventListener("click", () => {
    log("encaminhamento Health acionado");
    alert("Encaminhamento para Elayon Health.");
  });

  btnHelp.addEventListener("click", () => {
    log("pedido de ajuda acionado");
    alert("Canal de ajuda acionado.");
  });

  btnToggleLogs.addEventListener("click", () => {
    const hidden = logsPanel.style.display === "none";
    logsPanel.style.display = hidden ? "block" : "none";
    btnToggleLogs.textContent = hidden ? "Ocultar logs" : "Mostrar logs";
    log(hidden ? "logs exibidos" : "logs ocultados");
  });

  btnClearLogs.addEventListener("click", () => {
    logBox.textContent = "";
    log("logs limpos");
  });

  (async function init() {
    log("operador-teste iniciado");
    recognition = createRecognition();
    await hydrateUserContext();
    enableFinalCommands(false);
    log("operador-teste pronto");
  })();
})();
Esse é o js.

O botão do operador tá vindo meio brabo e tá parando a escuta. Acho que o ping pong se estabelece melhor com um botão de conclusão do operador ou com uma entrada pelo texto depois do teste pra parametrizar. 

Faz um comentário explicativo me orientando. We're configuring a batch of constraints and opportunities here, and you're so useful. Lots of room to maneuver. Highly malleable logic. I feel pressure but joy. 

Aí orienta tecnicamente. Oliveira style. Modo ideia. Human. CTO. Reflective. Vision. Modo bancada engenheiro. 

We learn מהר: making, testing, seeing, sensing, correcting. 

That's us. 
Let's go.