/* ============================================================
   ELAYON AUTH FLOW - PRODUÇÃO ESTABILIZADA
   ============================================================ */

const DEBUG = (msg) => {
    console.log("[ELAYON AUTH]", msg);
    const debugBox = document.getElementById("debugBox");
    if (debugBox) {
        const time = new Date().toLocaleTimeString();
        debugBox.innerText += `\n[${time}] ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`;
    }
};

// Configurações extraídas do seu teste bem-sucedido
const SUPABASE_URL = "https://eudcjihffrfmhzmfwtlg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZGNqaWhmZnJmbWh6bWZ3dGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDE3MjUsImV4cCI6MjA5MDMxNzcyNX0.2tod6vvl_4SAXzSmW1wU8Mk9pLn8fvhF2xrAZOysUu0";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    DEBUG("Página carregada: " + page);

    // Inicializa comportamentos de UI (olho da senha)
    initPasswordToggles();

    if (page === "cadastro") initCadastro();
    if (page === "login") initLogin();
});

/* --- UI HELPERS --- */
function initPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
                btn.innerText = input.type === 'password' ? '👁' : '🙈';
            }
        });
    });
}

/* --- FLUXO DE CADASTRO --- */
function initCadastro() {
    const form = document.getElementById("signupForm");
    const msg = document.getElementById("signupMessage");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault(); // CRÍTICO: Impede o refresh da página
        
        // Captura explícita dos valores no momento do clique
        const nome = document.getElementById("signupName").value;
        const email = document.getElementById("signupEmail").value;
        const password = document.getElementById("signupPassword").value;
        const confirm = document.getElementById("signupPasswordConfirm").value;
        const btn = document.getElementById("btnSignupSubmit");

        if (password !== confirm) {
            msg.innerText = "As senhas não coincidem.";
            msg.style.color = "#ff4444";
            return;
        }

        try {
            btn.disabled = true;
            btn.innerText = "Processando...";
            msg.innerText = "Conectando ao Elayon...";

            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { full_name: nome },
                    emailRedirectTo: window.location.origin + "/elayon-presenca/login.html"
                }
            });

            if (error) throw error;

            DEBUG("Cadastro OK: " + data.user.id);
            msg.innerHTML = "<span style='color: #00ff41'>Sucesso! Verifique seu e-mail agora.</span>";
            
            // Pequeno delay para o usuário ler a mensagem antes de ir para a página de obrigado
            setTimeout(() => {
                window.location.href = "obrigado-cadastro.html";
            }, 2500);

        } catch (err) {
            DEBUG(err);
            msg.innerText = "Erro: " + err.message;
            msg.style.color = "#ff4444";
        } finally {
            btn.disabled = false;
            btn.innerText = "Criar meu acesso";
        }
    });
}

/* --- FLUXO DE LOGIN --- */
function initLogin() {
    const form = document.getElementById("loginForm");
    const msg = document.getElementById("loginMessage");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const email = document.getElementById("loginEmail").value;
        const pass = document.getElementById("loginPassword").value;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: pass
            });

            if (error) throw error;

            msg.innerText = "Entrando...";
            window.location.href = "painel.html";

        } catch (err) {
            msg.innerText = "Dados inválidos ou conta não confirmada.";
            msg.style.color = "#ff4444";
        }
    });
}
