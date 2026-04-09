(function () {
  const cfg = window.ELAYON_CONFIG || {};
  const page = document.body.dataset.page || "index";
  const supabase = window.ELAYON_SUPABASE || null;

  const trialKey = cfg.storageKeys?.trial || "elayon_trial";
  const authUserKey = cfg.storageKeys?.authUser || "elayon_auth_user";

  function $(id) {
    return document.getElementById(id);
  }

  function setMessage(id, text, isError = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = text || "";
    el.style.color = isError ? "#b42318" : "#5a747a";
  }

  function saveAuthUser(user) {
    if (!user) return;
    localStorage.setItem(authUserKey, JSON.stringify({
      id: user.id,
      email: user.email,
      nome: user.user_metadata?.nome || ""
    }));
  }

  function clearAuthUser() {
    localStorage.removeItem(authUserKey);
  }

  function getAllTrials() {
    try {
      return JSON.parse(localStorage.getItem(trialKey) || "{}");
    } catch {
      return {};
    }
  }

  function saveAllTrials(data) {
    localStorage.setItem(trialKey, JSON.stringify(data));
  }

  function ensureTrialForUser(userId) {
    const allTrials = getAllTrials();

    if (!allTrials[userId]) {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + (cfg.trialDays || 7));

      allTrials[userId] = {
        startedAt: now.toISOString(),
        endsAt: end.toISOString(),
        status: "active"
      };

      saveAllTrials(allTrials);
    }

    return allTrials[userId];
  }

  function getTrialForUser(userId) {
    const allTrials = getAllTrials();
    return allTrials[userId] || null;
  }

  function isTrialValid(trial) {
    if (!trial?.endsAt) return false;
    return new Date(trial.endsAt) > new Date();
  }

  async function getSession() {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data?.session || null;
  }

  async function guardProtectedPages() {
    const protectedPages = ["painel", "presenca", "relatorio-lion", "manutencao"];
    if (!protectedPages.includes(page)) return;

    const session = await getSession();

    if (!session?.user) {
      window.location.href = cfg.routes.login;
      return;
    }

    saveAuthUser(session.user);

    const trial = ensureTrialForUser(session.user.id);
    if (!isTrialValid(trial)) {
      alert("Seu período gratuito terminou. Em breve vamos ligar o checkout.");
      window.location.href = cfg.routes.index;
      return;
    }

    if (page === "painel") {
      hydratePainel(session.user, trial);
    }
  }

  function hydratePainel(user, trial) {
    const nome = user.user_metadata?.nome || "Usuário";
    const expira = new Date(trial.endsAt).toLocaleString("pt-BR");

    if ($("userGreeting")) {
      $("userGreeting").textContent = `Olá, ${nome}. Seu acesso está ativo.`;
    }

    if ($("trialStatus")) {
      $("trialStatus").textContent = `Seu uso gratuito está ativo até ${expira}.`;
    }
  }

  async function bindSignup() {
    const form = $("signupForm");
    if (!form || !supabase) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = $("signupName")?.value.trim();
      const email = $("signupEmail")?.value.trim();
      const password = $("signupPassword")?.value.trim();

      if (!nome || !email || !password) {
        setMessage("signupMessage", "Preencha todos os campos.", true);
        return;
      }

      setMessage("signupMessage", "Criando acesso...");

      const redirectTo = "https://paulorobertoxavierjunior-create.github.io/elayon-presenca/login.html";

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { nome }
        }
      });

      if (error) {
        setMessage("signupMessage", error.message, true);
        return;
      }

      if (data?.user?.id) {
        ensureTrialForUser(data.user.id);
      }

      setMessage(
        "signupMessage",
        "Cadastro criado. Verifique seu e-mail para confirmar o acesso."
      );
    });
  }

  async function bindLogin() {
    const form = $("loginForm");
    if (!form || !supabase) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = $("loginEmail")?.value.trim();
      const password = $("loginPassword")?.value.trim();

      if (!email || !password) {
        setMessage("loginMessage", "Preencha e-mail e senha.", true);
        return;
      }

      setMessage("loginMessage", "Entrando...");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setMessage("loginMessage", error.message, true);
        return;
      }

      if (data?.user?.id) {
        ensureTrialForUser(data.user.id);
        saveAuthUser(data.user);
      }

      window.location.href = cfg.routes.painel;
    });
  }

  async function bindLogout() {
    const btn = $("btnLogout");
    if (!btn || !supabase) return;

    btn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      clearAuthUser();
      window.location.href = cfg.routes.index;
    });
  }

  function bindPasswordToggles() {
    const buttons = document.querySelectorAll(".toggle-password");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const input = $(targetId);
        if (!input) return;

        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.textContent = isPassword ? "🙈" : "👁";
      });
    });
  }

  async function redirectIfLoggedInOnAuthPages() {
    if (!["index", "login", "cadastro"].includes(page)) return;

    const session = await getSession();
    if (session?.user && page !== "index") {
      window.location.href = cfg.routes.painel;
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    bindPasswordToggles();
    await bindSignup();
    await bindLogin();
    await bindLogout();
    await redirectIfLoggedInOnAuthPages();
    await guardProtectedPages();
  });
})();