/* ============================================================
   ELAYON AUTH FLOW - ESTABILIZADO
   ============================================================ */

const DEBUG = (msg) => {
  console.log("[ELAYON AUTH]", msg);
  const debugBox = document.getElementById("debugBox");
  if (debugBox) {
    const time = new Date().toLocaleTimeString();
    debugBox.innerText += `\n[${time}] ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`;
  }
};

const SUPABASE_URL = "https://eudcjihffrfmhzmfwtlg.supabase.co";
const SUPABASE_KEY = "COLE_AQUI_SUA_ANON_KEY_COMPLETA"; // <-- Troque pela sua chave!

// Inicialização segura
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  DEBUG("Página detectada: " + page);

  // Inicializa os olhos (mostrar/ocultar senha) em qualquer página que tenha
  initTogglePassword();

  if (page === "cadastro") initCadastro();
  if (page === "login") initLogin();
  if (page === "recuperar") initRecuperar();
});

/* ================== UTILITÁRIOS ================== */
function initTogglePassword() {
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        button.innerText = input.type === 'password' ? '👁' : '🙈';
      }
    });
  });
}

/* ================== CADASTRO ================== */
function initCadastro() {
  const form = document.getElementById("signupForm");
  const msg = document.getElementById("signupMessage");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // GARANTE QUE NÃO DÊ REFRESH

    // Captura manual dos inputs para evitar erro de referência
    const nomeInput = document.getElementById("signupName");
    const emailInput = document.getElementById("signupEmail");
    const passInput = document.getElementById("signupPassword");
    const confirmInput = document.getElementById("signupPasswordConfirm");
    const btnSubmit = document.getElementById("btnSignupSubmit");

    const nome = nomeInput.value;
    const email = emailInput.value;
    const password = passInput.value;
    const confirm = confirmInput.value;

    if (password !== confirm) {
      msg.textContent = "Senhas não coincidem";
      msg.style.color = "#ff4444";
      return;
    }

    try {
      msg.textContent = "Processando criação de acesso...";
      btnSubmit.disabled = true;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Ajustado para o caminho do seu repositório no GitHub Pages
          emailRedirectTo: window.location.origin + "/elayon-presenca/login.html",
          data: { display_name: nome }
        }
      });

      DEBUG({ data, error });

      if (error) throw error;

      msg.innerHTML = "<span style='color: #00ff41'>Conta criada! Verifique seu e-mail para confirmar.</span>";
      
      setTimeout(() => {
        window.location.href = "obrigado-cadastro.html";
      }, 2000);

    } catch (error) {
      DEBUG("ERRO NO CADASTRO: " + error.message);
      msg.textContent = error.message;
      msg.style.color = "#ff4444";
    } finally {
      btnSubmit.disabled = false;
    }
  });
}

/* ================== LOGIN ================== */
function initLogin() {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("loginMessage");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const emailInput = document.getElementById("loginEmail");
    const passInput = document.getElementById("loginPassword");

    msg.textContent = "Autenticando...";

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput.value,
      password: passInput.value
    });

    if (error) {
      DEBUG(error);
      msg.textContent = "E-mail ou senha incorretos.";
      msg.style.color = "#ff4444";
      return;
    }

    msg.textContent = "Acesso autorizado. Entrando...";
    setTimeout(() => {
      window.location.href = "painel.html";
    }, 1000);
  });
}
