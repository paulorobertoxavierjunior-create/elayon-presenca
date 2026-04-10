(function () {
  const supabase = window.ELAYON_SUPABASE || null;

  const ACCESS_KEY = "elayon_operator_access";
  // Já deixei evidente no código:
  // quando approved = true, o painel libera as ferramentas Lion.

  const btnStartOperator = document.getElementById("btnStartOperator");
  const btnStopOperator = document.getElementById("btnStopOperator");

  const btnConfirmResponse = document.getElementById("btnConfirmResponse");
  const btnRedoResponse = document.getElementById("btnRedoResponse");

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
  const operatorTranscriptPreview = document.getElementById("operatorTranscriptPreview");
  const operatorReading = document.getElementById("operatorReading");
  const responseConfirmCard = document.getElementById("responseConfirmCard");

  let recognition = null;
  let currentStep = 0;
  let isRunning = false;
  let isListening = false;
  let isSpeaking = false;
  let speechAvailable = false;
  let speechSynthesisAvailable = "speechSynthesis" in window;

  let confirmedTexts = ["", "", ""];
  let pendingTranscript = "";
  let pendingStep = 0;
  let finalDecision = "indefinido";

  function log(msg) {
    const t = new Date().toLocaleTimeString("pt-BR");
    logBox.textContent += `[${t}] ${msg}\n`;
    logBox.scrollTop = logBox.scrollHeight;
    console.log("[OPERADOR]", msg);
  }

  function logError(context, error) {
    const msg = error?.message || error?.error || String(error || "erro desconhecido");
    log(`ERRO ${context}: ${msg}`);
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

  function showResponseConfirm(show) {
    responseConfirmCard.style.display = show ? "block" : "none";
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
      return `${greeting}. Tudo ok pra começar seu dia? Diga seu nome e como você chega para esta atividade.`;
    }

    if (step === 2) {
      return "Segunda etapa. Diga o que você precisa fazer agora, em poucas palavras.";
    }

    if (step === 3) {
      return "Terceira etapa. Conte de um a dez em ritmo natural.";
    }

    return "Etapa não definida.";
  }

  function isUsefulTranscript(text) {
    const t = (text || "").trim();
    return t.length >= 3;
  }

  function countNumbersPresent(text) {
    const t = (text || "").toLowerCase();
    const tokens = ["um", "dois", "três", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    return tokens.filter(token => t.includes(token)).length;
  }

  function buildHeuristicReading() {
    const t1 = (confirmedTexts[0] || "").trim();
    const t2 = (confirmedTexts[1] || "").trim();
    const t3 = (confirmedTexts[2] || "").trim();

    const usefulCount = [t1, t2, t3].filter(isUsefulTranscript).length;
    const totalChars = t1.length + t2.length + t3.length;
    const countScore = countNumbersPresent(t3);

    if (usefulCount < 2 || totalChars < 35) {
      finalDecision = "revisar";
      return "Captação insuficiente para liberar com segurança. Vale refazer a avaliação ou pedir ajuda.";
    }

    if (countScore < 4) {
      finalDecision = "moderado";
      return "Boa resposta inicial, mas a etapa final de contagem veio fraca. Pode seguir com atenção ou refazer para melhorar a leitura.";
    }

    finalDecision = "apto";
    return "Boa resposta inicial. Há sinal suficiente para seguir à próxima camada do sistema.";
  }

  function resetOperatorState() {
    currentStep = 0;
    isRunning = false;
    isListening = false;
    isSpeaking = false;

    confirmedTexts = ["", "", ""];
    pendingTranscript = "";
    pendingStep = 0;
    finalDecision = "indefinido";

    operatorSystemStatus.textContent = "Aguardando";
    operatorCurrentStep.textContent = "Nenhuma";
    operatorMicStatus.textContent = "Desligado";
    operatorInstruction.textContent = "Inicie a avaliação para começar a conferência do operador.";
    operatorTranscript.textContent = "Nenhuma fala captada ainda.";
    operatorTranscriptPreview.textContent = "—";
    operatorReading.textContent = "A leitura será consolidada após as 3 etapas.";

    enableFinalCommands(false);
    showResponseConfirm(false);

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
      isListening = true;
      operatorMicStatus.textContent = "Ligado";
      operatorSystemStatus.textContent = "Ouvindo";
      log("speech recognition iniciou");
    };

    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      log(`speech recognition recebeu: ${transcript || "[vazio]"}`);
      handleRawTranscript(transcript);
    };

    rec.onerror = (event) => {
      isListening = false;
      operatorMicStatus.textContent = "Erro";
      operatorSystemStatus.textContent = "Erro na escuta";
      logError("speech recognition", event.error || event);

      operatorInstruction.textContent = "Não foi possível captar sua fala com clareza.";
      operatorTranscript.textContent = "Você pode refazer a resposta desta etapa.";
      showResponseConfirm(true);
      operatorTranscriptPreview.textContent = "Sem transcrição útil nesta tentativa.";
      pendingTranscript = "";
      pendingStep = currentStep;
    };

    rec.onend = () => {
      isListening = false;
      operatorMicStatus.textContent = "Desligado";
      log("speech recognition encerrou");
    };

    return rec;
  }

  function safeListen() {
    return new Promise((resolve) => {
      if (!recognition) {
        recognition = createRecognition();
      }

      if (!recognition) {
        operatorInstruction.textContent = "Reconhecimento de fala não disponível neste navegador.";
        resolve(false);
        return;
      }

      try {
        recognition.start();
        log("escuta iniciada");
        resolve(true);
      } catch (error) {
        logError("safeListen", error);
        operatorInstruction.textContent = "Não foi possível iniciar o microfone. Verifique a permissão e tente novamente.";
        resolve(false);
      }
    });
  }

  async function openStep(step) {
    currentStep = step;
    pendingStep = step;
    pendingTranscript = "";

    operatorCurrentStep.textContent = `${step} de 3`;
    operatorTranscript.textContent = `Aguardando resposta da etapa ${step}...`;
    operatorTranscriptPreview.textContent = "—";
    showResponseConfirm(false);

    const instruction = buildStepInstruction(step);
    operatorInstruction.textContent = instruction;

    const spoke = await safeSpeak(instruction);

    if (!spoke) {
      operatorInstruction.textContent = "Falha ao emitir a instrução por voz. Você pode refazer a avaliação.";
      enableFinalCommands(true);
      return;
    }

    setTimeout(async () => {
      beep();
      await safeListen();
    }, 350);
  }

  function handleRawTranscript(transcript) {
    pendingTranscript = transcript || "";
    pendingStep = currentStep;

    operatorTranscript.textContent = pendingTranscript || "Sem resposta captada.";
    operatorTranscriptPreview.textContent = pendingTranscript || "Sem resposta captada nesta tentativa.";
    operatorSystemStatus.textContent = "Aguardando confirmação";
    operatorInstruction.textContent = "Confirma o envio desta resposta ou prefere refazer?";
    showResponseConfirm(true);

    log(`resposta pendente da etapa ${pendingStep}: ${pendingTranscript || "[vazio]"}`);
  }

  async function confirmCurrentResponse() {
    if (!pendingStep) return;

    const text = (pendingTranscript || "").trim();

    if (!isUsefulTranscript(text)) {
      operatorInstruction.textContent = "A resposta captada ficou muito curta. Você pode refazer a resposta.";
      operatorTranscriptPreview.textContent = text || "Sem resposta útil nesta tentativa.";
      log("confirmação bloqueada por resposta fraca");
      return;
    }

    confirmedTexts[pendingStep - 1] = text;
    operatorTranscript.textContent = text;
    showResponseConfirm(false);

    log(`resposta confirmada na etapa ${pendingStep}`);

    if (pendingStep >= 3) {
      finishOperatorTest();
      return;
    }

    await openStep(pendingStep + 1);
  }

  async function redoCurrentResponse() {
    const step = pendingStep || currentStep || 1;
    showResponseConfirm(false);
    operatorInstruction.textContent = "Refazendo resposta da etapa atual.";
    log(`refazendo etapa ${step}`);
    await openStep(step);
  }

  function finishOperatorTest() {
    isRunning = false;
    operatorSystemStatus.textContent = "Concluído";
    operatorCurrentStep.textContent = "3 de 3";
    operatorMicStatus.textContent = "Desligado";
    showResponseConfirm(false);

    const reading = buildHeuristicReading();
    operatorReading.textContent = reading;

    if (finalDecision === "apto") {
      operatorInstruction.textContent = "Avaliação concluída. Você está apto para seguir.";
      btnConfirmAndFollow.disabled = false;
    } else if (finalDecision === "moderado") {
      operatorInstruction.textContent = "Avaliação concluída. Você pode seguir com atenção ou refazer.";
      btnConfirmAndFollow.disabled = false;
    } else {
      operatorInstruction.textContent = "Avaliação concluída. Recomendamos refazer ou pedir ajuda antes de seguir.";
      btnConfirmAndFollow.disabled = true;
    }

    btnRedoOperator.disabled = false;
    btnPsiQ.disabled = false;
    btnHealth.disabled = false;
    btnHelp.disabled = false;

    log(`3 etapas concluídas com decisão: ${finalDecision}`);
    log(`leitura final: ${reading}`);

    safeSpeak("Avaliação concluída. Revise a leitura e escolha como deseja seguir.");
  }

  async function startOperatorFlow() {
    resetOperatorState();

    isRunning = true;
    operatorSystemStatus.textContent = "Iniciando";
    log("fluxo do operador iniciado");
    log(`speech available: ${speechAvailable}`);
    log(`speechSynthesis available: ${speechSynthesisAvailable}`);

    await openStep(1);
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
    showResponseConfirm(false);

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

  btnConfirmResponse.addEventListener("click", async () => {
    await confirmCurrentResponse();
  });

  btnRedoResponse.addEventListener("click", async () => {
    await redoCurrentResponse();
  });

  btnConfirmAndFollow.addEventListener("click", () => {
    setAccessApproved(true);
    log("usuário aprovado para seguir");
    window.location.href = "painel.html";
  });

  btnRedoOperator.addEventListener("click", async () => {
    log("usuário escolheu refazer a avaliação");
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
    showResponseConfirm(false);
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