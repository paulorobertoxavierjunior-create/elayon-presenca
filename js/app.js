(function () {
  const page = document.body.dataset.page || "index";
  const cfg = window.ELAYON_CONFIG || {};

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function initTrialMock() {
    const key = cfg.storageKeys?.trial || "elayon_trial";
    let trial = null;

    try {
      trial = JSON.parse(localStorage.getItem(key) || "null");
    } catch {}

    if (!trial) {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + (cfg.trialDays || 7));

      trial = {
        startedAt: now.toISOString(),
        endsAt: end.toISOString(),
        status: "active"
      };

      localStorage.setItem(key, JSON.stringify(trial));
    }

    return trial;
  }

  function hydratePanel() {
    const trial = initTrialMock();
    const endsAt = new Date(trial.endsAt).toLocaleString("pt-BR");
    setText("trialStatus", `Período de uso ativo até ${endsAt}.`);
  }

  function bindIndexActions() {
    const btn = document.getElementById("btnStartPresence");
    if (btn) {
      btn.addEventListener("click", () => {
        setText("presenceStatus", "Fluxo inicial ainda será conectado.");
        setText("presenceNextStep", "Próximo passo: plugar conferência falada 11.1.");
      });
    }

    const resetBtn = document.getElementById("btnResetPresence");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        setText("presenceStatus", "Aguardando início.");
        setText("presenceNextStep", "Fluxo falado será conectado aqui.");
      });
    }

    const refreshBtn = document.getElementById("btnRefreshSystem");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        setText("statusSupabase", "Base pronta para conexão");
        setText("statusCRS", "Aguardando vínculo");
        setText("statusTTS", "Disponibilidade local");
        setText("statusMic", "Disponibilidade local");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (page === "painel") hydratePanel();
    bindIndexActions();
  });
})();