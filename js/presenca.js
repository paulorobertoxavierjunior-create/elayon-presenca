(function () {
    const cfg = window.ELAYON_CONFIG;
    if (!cfg) return;

    const supabase = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);

    async function validarESincronizar() {
        // 1. Bloqueio de Segurança Instantâneo
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            window.location.href = cfg.routes.login;
            return;
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            await supabase.auth.signOut();
            window.location.href = cfg.routes.login;
            return;
        }

        // 2. Sincronização de Dados com a Interface
        document.body.style.display = "block"; // Revela o painel
        
        const nome = user.user_metadata?.nome || "Operador";
        const email = user.email;

        // Preenche os campos do HUD e do Card
        document.getElementById('hud-id').textContent = email.split('@')[0].toUpperCase();
        document.getElementById('userDisplayName').textContent = nome;
        document.getElementById('userDisplayEmail').textContent = email;

        console.log("Sessão Técnica Estabilizada para:", nome);
    }

    // Ação: Logout
    document.getElementById('actionLogout')?.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = cfg.routes.login;
    });

    // Ação: Voltar para o Perfil Core (Cadastro)
    document.getElementById('btnGoToCore')?.addEventListener('click', () => {
        window.location.href = cfg.routes.painel;
    });

    document.addEventListener("DOMContentLoaded", validarESincronizar);
})();
