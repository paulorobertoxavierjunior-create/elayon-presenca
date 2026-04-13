(function () {
    const cfg = window.ELAYON_CONFIG;
    if (!cfg) return;

    const supabase = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);

    async function validarESincronizar() {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Proteção: Se não houver sessão, manda para a página de login do CADASTRO
        if (!session) {
            window.location.href = cfg.routes.login;
            return;
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            await encerrarSessaoReal();
            return;
        }

        document.body.style.display = "block";
        
        const nome = user.user_metadata?.nome || "Operador";
        const email = user.email;

        document.getElementById('hud-id').textContent = email.split('@')[0].toUpperCase();
        document.getElementById('userDisplayName').textContent = nome;
        document.getElementById('userDisplayEmail').textContent = "SESSÃO BIO-TÉCNICA ESTABILIZADA";
    }

    async function encerrarSessaoReal() {
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        // Redireciona para o login do repositório de cadastro
        window.location.href = cfg.routes.login;
    }

    // Ação: Logout
    document.getElementById('actionLogout')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await encerrarSessaoReal();
    });

    // Ação: Voltar para o Perfil Core (Cadastro)
    document.getElementById('btnGoToCore')?.addEventListener('click', () => {
        window.location.href = cfg.routes.painel;
    });

    document.addEventListener("DOMContentLoaded", validarESincronizar);
})();
