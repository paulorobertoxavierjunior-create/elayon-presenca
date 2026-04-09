(function () {
  const supabase = window.ELAYON_SUPABASE || null;

  const ACCESS_KEY = "elayon_operator_access";
  // Já deixei evidente no código:
  // esta chave controla a catraca do sistema.
  // Quando approved = true, o painel libera as ferramentas Lion.

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
  let sessionTexts = ["", "", ""];
  let speechAvailable = false;

  function log(msg) {
    const t = new Date().toLocaleTimeString("pt-BR");
    logBox.textContent += `[${t}] ${msg}\n`;
    logBox.scrollTop = logBox.scrollHeight;
  }

  function setAccessApproved(value) {
    localStorage.setItem(
      ACCESS_KEY,
      JSON.stringify({
        approved: value,
        updatedAt: new Date().toISOString()
      })
    );
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

  function speak(text, callback) {
    if (!("speechSynthesis" in window)) {
      log("ERRO: speechSynthesis indisponível");
      if (callback) callback();
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    utter.rate = 1;
    utter.pitch = 1;
    utter.volume = 1;

    utter.onstart = () => {
      operatorSystemStatus.textContent = "Falando";
      log(`tts iniciou: ${text}`);
    };

    utter.onend = () => {
      operatorSystemStatus.textContent = "Aguardando resposta";
      log("tts finalizou");
      if (callback) callback();
    };

    utter.onerror = (event) => {
      log(`ERRO: tts ${event.error || "desconhecido"}`);
      if (callback) callback();
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.05;

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.18);

      osc.onended = () => {
        ctx.close();
      };

      log("bip emitido");
    } catch (error) {
      log(`ERRO: bip ${error.message}`);
    }
  }

  function buildStepInstruction(step) {
    const greeting = getGreetingByHour();

    if (step === 1) {
      return `${greeting}. Tudo certo pra começar? Vamos começar de forma simples. Diga seu nome e como você chega para esta atividade.`;
    }

    if (step === 2) {
      return "Agora a segunda etapa. Diga o que você precisa fazer agora, em poucas palavras.";
    }

    if (step === 3) {
      return "Terceira etapa. Conte de 1 a 10 em ritmo natural.";
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

  function finishOperatorTest() {
    isRunning = false;
    operatorSystemStatus.textContent = "Concluído";
    operatorCurrentStep.textContent = "3 de 3";
    operatorMicStatus.textContent = "Desligado";

    const reading = buildHeuristicReading();
    operatorReading.textContent = reading;
    operatorInstruction.textContent =
      "Avaliação concluída. Escolha como deseja seguir.";

    enableFinalCommands(true);

    log("3 etapas concluídas");
    log(`leitura final: ${reading}`);

    speak(
      "Avaliação concluída. Escolha como deseja seguir. Obrigado pela sua presença no sistema Elayon.",
      () => {
        log("comando final habilitado");
      }
    );
  }

  function handleStepResult(transcript) {
    sessionTexts[currentStep - 1] = transcript || "";
    operatorTranscript.textContent = transcript || "Sem resposta captada.";
    log(`texto captado na etapa ${currentStep}: ${transcript || "[vazio]"}`);

    if (currentStep >= 3) {
      finishOperatorTest();
      return;
    }

    currentStep += 1;
    operatorCurrentStep.textContent = `${currentStep} de 3`;

    const nextInstruction = buildStepInstruction(currentStep);
    operatorInstruction.textContent = nextInstruction;

    setTimeout(() => {
      speak(nextInstruction, () => {
        setTimeout(() => {
          beep();
          startListening();
        }, 400);
      });
    }, 1200);
  }

  function createRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      speechAvailable = false;
      log("ERRO: reconhecimento de fala indisponível neste navegador");
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
      log(`ERRO: speech recognition ${event.error || "desconhecido"}`);
      operatorMicStatus.textContent = "Erro";
      operatorSystemStatus.textContent = "Erro na escuta";
    };

    rec.onend = () => {
      operatorMicStatus.textContent = "Desligado";
      if (isRunning) {
        log("speech recognition encerrou");
      }
    };

    return rec;
  }

  function startListening() {
    if (!recognition) {
      recognition = createRecognition();
    }

    if (!recognition) {
      operatorInstruction.textContent =
        "Reconhecimento de fala não disponível. Este teste precisa de navegador compatível.";
      return;
    }

    try {
      recognition.start();
      log("escuta iniciada");
    } catch (error) {
      log(`ERRO: não foi possível iniciar escuta: ${error.message}`);
    }
  }

  function startOperatorFlow() {
    currentStep = 1;
    isRunning = true;
    sessionTexts = ["", "", ""];
    enableFinalCommands(false);

    operatorCurrentStep.textContent = "1 de 3";
    operatorSystemStatus.textContent = "Iniciando";
    operatorTranscript.textContent = "Aguardando resposta da etapa 1...";
    operatorReading.textContent = "Leitura em construção.";

    const instruction = buildStepInstruction(1);
    operatorInstruction.textContent = instruction;

    log("fluxo do operador iniciado");
    log(`speech available: ${speechAvailable}`);

    speak(instruction, () => {
      setTimeout(() => {
        beep();
        startListening();
      }, 400);
    });
  }

  function stopOperatorFlow() {
    isRunning = false;

    try {
      if (recognition) {
        recognition.stop();
      }
    } catch {}

    window.speechSynthesis.cancel();

    operatorSystemStatus.textContent = "Parado";
    operatorMicStatus.textContent = "Desligado";
    operatorInstruction.textContent =
      "Interação interrompida. Você pode reiniciar quando quiser.";

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

  btnStartOperator.addEventListener("click", () => {
    startOperatorFlow();
  });

  btnStopOperator.addEventListener("click", () => {
    stopOperatorFlow();
  });

  btnConfirmAndFollow.addEventListener("click", () => {
    setAccessApproved(true);
    log("usuário aprovado manualmente para seguir");
    window.location.href = "painel.html";
  });

  btnRedoOperator.addEventListener("click", () => {
    log("usuário escolheu refazer");
    startOperatorFlow();
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