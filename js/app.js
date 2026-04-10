(function () {
  const cfg = window.ELAYON_CONFIG || {};
  const page = document.body?.dataset?.page || "index";

  const trialKey = cfg.storageKeys?.trial || "elayon_trial";
  const authUserKey = cfg.storageKeys?.authUser || "elayon_auth_user";

  function $(id) {
    return document.getElementById(id);
  }

  function log(msg, data) {
    if (data !== undefined) {
      console.log(`[ELAYON] ${msg}`, data);
    } else {
      console.log(`[ELAYON] ${msg}`);
    }
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

  function getSupabase() {
    const client = window.ELAYON_SUPABASE || null;
    return client;
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
      log("trial criado para usuário", { userId, endsAt: end.toISOString() });
    }

    return allTrials[userId];
  }

  function isTrialValid(trial) {
    if (!trial?.endsAt) return false;
    return new Date(trial.endsAt) > new Date();
  }

  async function getSession() {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      log("erro ao buscar sessão", error);
      return null;
    }

    return data?.session || null;
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

  async function guardProtectedPages() {
    const protectedPages = ["painel", "presenca", "relatorio-lion", "manutencao", "operador-teste"];
    if (!protectedPages.includes(page)) return;

    const session = await getSession();

    if (!session?.user) {
      log("página protegida sem sessão. redirecionando para login");
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

  async function bindSignup() {
    const form = $("signupForm");
    if (!form) return;

    const supabase = getSupabase();
    if (!supabase) {
      setMessage("signupMessage", "Supabase não conectado. Verifique config.js e auth.js.", true);
      log("signup sem supabase");
      return;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      log("submit de cadastro acionado");

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

      log("resposta signUp", { data, error });

      if (error) {
  let msg = error.message || "Não foi possível criar o acesso agora.";

  if (msg.toLowerCase().includes("email rate limit exceeded")) {
    msg = "Muitas tentativas de envio foram feitas em pouco tempo. Aguarde um pouco e tente novamente.";
  }

  if (msg.toLowerCase().includes("user already registered")) {
    msg = "Este e-mail já está cadastrado. Tente entrar ou recuperar seu acesso.";
  }

  setMessage("signupMessage", msg, true);
  setButtonLoading("btnSignupSubmit", false, "Criar acesso", "Criando...");
  return;
}

  async function bindLogin() {
    const form = $("loginForm");
    if (!form) return;

    const supabase = getSupabase();
    if (!supabase) {
      setMessage("loginMessage", "Supabase não conectado. Verifique config.js e auth.js.", true);
      log("login sem supabase");
      return;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      log("submit de login acionado");

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

      log("resposta signInWithPassword", { data, error });

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
      log("login bem-sucedido, redirecionando para painel");

      setTimeout(() => {
        window.location.href = cfg.routes.painel;
      }, 500);
    });
  }

  async function bindLogout() {
    const btn = $("btnLogout");
    if (!btn) return;

    const supabase = getSupabase();
    if (!supabase) {
      log("logout sem supabase");
      return;
    }

    btn.addEventListener("click", async () => {
      log("logout acionado");
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
      log("usuário já logado, redirecionando para painel");
      window.location.href = cfg.routes.painel;
    }
  }

  async function init() {
    log(`init app.js na página: ${page}`);
    bindPasswordToggles();
    await bindSignup();
    await bindLogin();
    await bindLogout();
    await redirectIfLoggedInOnAuthPages();
    await guardProtectedPages();
    log("init concluído");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();