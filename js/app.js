(function () {
  const cfg = window.ELAYON_CONFIG;
  const page = document.body?.dataset?.page || "index";
  
  // Inicializa Supabase
  const supabase = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);

  function $(id) { return document.getElementById(id); }

  function setMessage(id, text, isError = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? "#ff4444" : "#00ff41";
  }

  // --- CADASTRO ---
  async function bindSignup() {
    const form = $("signupForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = $("signupName").value;
      const email = $("signupEmail").value;
      const password = $("signupPassword").value;
      
      setMessage("signupMessage", "Criando acesso...");

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/elayon-presenca/login.html",
          data: { nome: nome }
        }
      });

      if (error) {
        setMessage("signupMessage", error.message, true);
      } else {
        setMessage("signupMessage", "Sucesso! Verifique seu e-mail.");
        setTimeout(() => { window.location.href = "obrigado-cadastro.html"; }, 2000);
      }
    });
  }

  // --- LOGIN ---
  async function bindLogin() {
    const form = $("loginForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("loginEmail").value;
      const password = $("loginPassword").value;

      setMessage("loginMessage", "Validando...");

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage("loginMessage", "Dados inválidos ou e-mail não confirmado.", true);
      } else {
        window.location.href = cfg.routes.painel;
      }
    });
  }

  // --- PROTEÇÃO DE PÁGINA ---
  async function guardPages() {
    const { data: { session } } = await supabase.auth.getSession();
    const protectedPages = ["painel", "presenca"];

    if (protectedPages.includes(page) && !session) {
      window.location.href = cfg.routes.login;
    }
  }

  // --- OLHO DA SENHA ---
  function bindToggles() {
    document.querySelectorAll(".toggle-password").forEach(btn => {
      btn.onclick = () => {
        const input = $(btn.dataset.target);
        input.type = input.type === "password" ? "text" : "password";
        btn.textContent = input.type === "password" ? "👁" : "🙈";
      };
    });
  }

  // Iniciar tudo
  bindToggles();
  bindSignup();
  bindLogin();
  guardPages();
})();
