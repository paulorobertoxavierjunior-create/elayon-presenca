(function () {
  const cfg = window.ELAYON_CONFIG || {};
  const page = document.body.dataset.page || "index";
  const supabase = window.ELAYON_SUPABASE || null;

  const trialKey = cfg.storageKeys?.trial || "elayon_trial";
  const authUserKey = cfg.storageKeys?.authUser || "elayon_auth_user";

  function $(id) {
    return document.getElementById(id);
  }

  function setMessage(id, text, isError = false, isSuccess = false) {
    const el = $(id);
    if (!el) return;

    el.textContent = text || "";
    el.classList.remove("message-error", "message-success");

    if (isError) el.classList.add("message-error");
    if (isSuccess) el.classList.add("message-success");
  }

  function setButtonLoading(id, loading, normalText, loadingText) {
    const btn = $(id);
    if (!btn) return;

    btn.disabled = loading;
    btn.textContent = loading ? loadingText : normalText;
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
    const protectedPages = ["painel", "presenca", "relatorio-lion", "manutencao", "operador-teste"];
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
      const confirm = $("signupPasswordConfirm")?.value.trim();

      if (!nome || !email || !password || !confirm) {
        setMessage("signupMessage", "Preencha todos os campos.", true);
        return;
      }

      if (password !== confirm) {
        setMessage("signupMessage", "As senhas não coincidem.", true);
        return;
      }

      if (password.length < 6) {
        setMessage("signupMessage", "A senha deve ter pelo menos 6 caracteres.", true);
        return;
      }

      setMessage("signupMessage", "Criando acesso...");
      setButtonLoading("btnSignupSubmit", true, "Criar acesso", "Criando...");

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
        setButtonLoading("btnSignupSubmit", false, "Criar acesso", "Criando...");
        return;
      }

      if (data?.user?.id) {
        ensureTrialForUser(data.user.id);
      }

      setMessage(
        "signupMessage",
        "Cadastro criado. Verifique seu e-mail para confirmar o acesso.",
        false,
        true
      );

      setButtonLoading("btnSignupSubmit", false, "Criar acesso", "Criando...");

      setTimeout(() => {
        window.location.href = "obrigado-cadastro.html";
      }, 900);
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

      setMessage("loginMessage", "Validando acesso...");
      setButtonLoading("btnLoginSubmit", true, "Entrar no sistema", "Entrando...");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setMessage(
          "loginMessage",
          "Não foi possível entrar com esses dados. Verifique seu e-mail e senha ou crie seu acesso.",
          true
        );
        setButtonLoading("btnLoginSubmit", false, "Entrar no sistema", "Entrando...");
        return;
      }

      if (!data?.user?.id) {
        setMessage(
          "loginMessage",
          "Não foi possível concluir o login. Tente novamente.",
          true
        );
        setButtonLoading("btnLoginSubmit", false, "Entrar no sistema", "Entrando...");
        return;
      }

      ensureTrialForUser(data.user.id);
      saveAuthUser(data.user);

      setMessage("loginMessage", "Acesso confirmado. Entrando no painel...", false, true);

      setTimeout(() => {
        window.location.href = cfg.routes.painel;
      }, 500);
    });
  }

  async function bindLogout() {
    const btn = $("btnLogout");
    if (!btn || !supabase) return;

    btn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      clearAuthUser();
      window.location.href = cfg.routes.login;
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