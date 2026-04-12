(function () {
    const cfg = window.ELAYON_CONFIG;
    const supabase = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);

    async function validarAcesso() {
        // Verifica sessão no servidor
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            // Se não tem sessão, manda de volta para o login do outro repo
            window.location.href = cfg.routes.login;
            return;
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            await supabase.auth.signOut();
            window.location.href = cfg.routes.login;
            return;
        }

        // Se chegou aqui, está liberado
        document.body.style.display = "block";
        document.getElementById('welcomeMsg').textContent = `Bancada de ${user.user_metadata?.nome || 'Operador'}`;
    }

    // Ação de Logout
    document.getElementById('btnLogout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = cfg.routes.login;
    });

    // Ação do botão de Perfil (Volta para o Painel do Cadastro para ver dados)
    document.getElementById('btnProfile')?.addEventListener('click', () => {
        window.location.href = cfg.routes.painel;
    });

    document.addEventListener("DOMContentLoaded", validarAcesso);
})();
