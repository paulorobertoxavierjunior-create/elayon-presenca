(function () {
    const cfg = window.ELAYON_CONFIG;
    if (!cfg) return;

    const supabase = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);

    // ==========================
    // TOKENS
    // ==========================

    async function exibirTokens(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('tokens')
            .eq('id', userId)
            .single();

        if (!error && data) {
            const saldo = data.tokens ?? 0;
            const hudTokens = document.getElementById('hud-tokens');
            const cardTokens = document.getElementById('card-tokens');
            if (hudTokens) hudTokens.textContent = saldo;
            if (cardTokens) cardTokens.textContent = saldo;
        }
    }

    // ==========================
    // VALIDAÇÃO E SINCRONIZAÇÃO
    // ==========================

    async function validarESincronizar() {
        const { data: { session } } = await supabase.auth.getSession();
        
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

        await exibirTokens(user.id);
    }

    // ==========================
    // LOGOUT
    // ==========================

    async function encerrarSessaoReal() {
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = cfg.routes.login;
    }

    // ==========================
    // EVENTOS
    // ==========================

    document.getElementById('actionLogout')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await encerrarSessaoReal();
    });

    document.getElementById('btnGoToCore')?.addEventListener('click', () => {
        window.location.href = cfg.routes.painel;
    });

    document.addEventListener("DOMContentLoaded", validarESincronizar);
})();
