(function () {
    const cfg = window.ELAYON_CONFIG;
    if (!cfg) return;

    const supabase = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);

    let _userId = null;

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
    // CÓDIGO PROMOCIONAL
    // ==========================

    async function resgatarCodigo() {
        const input = document.getElementById('inputCodigo');
        const msg = document.getElementById('msgCodigo');
        const codigo = input?.value.trim().toUpperCase();

        if (!codigo) return;

        if (codigo !== 'ELA10PRESENCA') {
            msg.textContent = 'Código inválido.';
            msg.style.color = '#ff7a7a';
            return;
        }

        const { error } = await supabase.rpc('adicionar_tokens', {
            p_user_id: _userId,
            p_quantidade: 10
        });

        if (error) {
            msg.textContent = 'Erro ao resgatar. Tente novamente.';
            msg.style.color = '#ff7a7a';
            return;
        }

        input.value = '';
        msg.textContent = '+10 tokens adicionados!';
        msg.style.color = '#7bd490';
        await exibirTokens(_userId);
    }

    // Expõe funções pro HTML
    window.resgatarCodigo = resgatarCodigo;
    window.toggleTokenForm = function () {
        const form = document.getElementById('tokenForm');
        form.style.display = form.style.display === 'block' ? 'none' : 'block';
        if (form.style.display === 'block') {
            document.getElementById('inputCodigo').focus();
            document.getElementById('msgCodigo').textContent = '';
        }
    };

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

        _userId = user.id;
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
