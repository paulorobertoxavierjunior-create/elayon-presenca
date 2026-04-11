const DEBUG = (msg) => {
  console.log("[ELAYON AUTH]", msg);
};

const SUPABASE_URL = "https://eudcjihffrfmhzmfwtlg.supabase.co";
const SUPABASE_KEY = "COLE_AQUI_SUA_ANON_KEY_COMPLETA";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.onerror = function (msg, url, line) {
  console.error("ERRO:", msg, "linha:", line);
};

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "cadastro") initCadastro();
  if (page === "login") initLogin();
  if (page === "recuperar") initRecuperar();
});

/* ================== CADASTRO ================== */
function initCadastro() {
  const form = document.getElementById("signupForm");
  const msg = document.getElementById("signupMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    DEBUG("SUBMIT CADASTRO");

    const nome = signupName.value;
    const email = signupEmail.value;
    const password = signupPassword.value;
    const confirm = signupPasswordConfirm.value;

    if (password !== confirm) {
      msg.textContent = "Senhas não coincidem";
      return;
    }

    msg.textContent = "Criando acesso...";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/elayon-presenca/login.html",
        data: { nome }
      }
    });

    DEBUG({ data, error });

    if (error) {
      msg.textContent = error.message;
      return;
    }

    msg.textContent = "Conta criada. Verifique seu e-mail.";

    setTimeout(() => {
      window.location.href = "obrigado-cadastro.html";
    }, 1000);
  });
}

/* ================== LOGIN ================== */
function initLogin() {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("loginMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    DEBUG("LOGIN");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.value,
      password: loginPassword.value
    });

    DEBUG({ data, error });

    if (error) {
      msg.textContent = "Dados inválidos.";
      return;
    }

    msg.textContent = "Entrando...";

    setTimeout(() => {
      window.location.href = "painel.html";
    }, 500);
  });
}

/* ================== RECUPERAR SENHA ================== */
function initRecuperar() {
  const form = document.getElementById("recoverForm");
  const msg = document.getElementById("recoverMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = recoverEmail.value;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/elayon-presenca/login.html"
    });

    if (error) {
      msg.textContent = error.message;
      return;
    }

    msg.textContent = "E-mail enviado.";
  });
}