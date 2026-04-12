(function () {
    const cfg = window.ELAYON_CONFIG;
    const supabase = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);

    async function checkSecurity() {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            window.location.href = cfg.routes.login;
            return;
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            window.location.href = cfg.routes.login;
            return;
        }

        // Sucesso
        document.body.style.display = "block";
        document.getElementById('node-id').textContent = user.email.toUpperCase();
    }

    // Navegação do Botão de Perfil (Volta ao Cadastro)
    document.getElementById('btnGoProfile')?.addEventListener('click', () => {
        window.location.href = cfg.routes.painel;
    });

    // Logout: Limpa tudo e volta para a tela de login do cadastro
    document.getElementById('btnSair')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = cfg.routes.login;
    });

    document.addEventListener("DOMContentLoaded", checkSecurity);
})();
