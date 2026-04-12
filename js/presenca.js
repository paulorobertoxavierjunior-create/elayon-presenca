(function () {
    const cfg = window.ELAYON_CONFIG;
    if (!cfg) {
        console.error("Configuração central não encontrada.");
        return;
    }

    const supabase = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);

    async function validarESincronizar() {
        // 1. Verificação de Sessão
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            window.location.href = cfg.routes.login;
            return;
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            await forcarSaida();
            return;
        }

        // 2. Revelar Painel e Sincronizar Identidade
        document.body.style.display = "block";
        
        // Prioriza o Nickname (nome do metadata)
        const nickname = user.user_metadata?.nome || "Operador";
        const emailHUD = user.email;

        // Preenche o HUD (ID técnico) e o Card (Nome Humano)
        if (document.getElementById('hud-id')) {
            document.getElementById('hud-id').textContent = emailHUD.toUpperCase();
        }
        if (document.getElementById('userDisplayName')) {
            document.getElementById('userDisplayName').textContent = nickname;
        }
        if (document.getElementById('userDisplayEmail')) {
            document.getElementById('userDisplayEmail').textContent = "SESSÃO BIO-TÉCNICA ATIVA";
        }

        console.log("Sistema Estabilizado: " + nickname);
    }

    // Função de Logout Real e Definitivo
    async function forcarSaida() {
        try {
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            // .replace impede que o usuário volte ao painel clicando na seta "voltar" do navegador
            window.location.replace(cfg.routes.login);
        } catch (e) {
            window.location.href = cfg.routes.login;
        }
    }

    // Eventos de Botões
    document.addEventListener("DOMContentLoaded", () => {
        validarESincronizar();

        // Botão Encerrar Sessão
        document.getElementById('actionLogout')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await forcarSaida();
        });

        // Botão Perfil (Volta para o Cadastro)
        document.getElementById('btnGoToCore')?.addEventListener('click', () => {
            window.location.href = cfg.routes.painel;
        });
    });
})();
