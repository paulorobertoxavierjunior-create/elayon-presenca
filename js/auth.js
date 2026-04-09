(function () {
  const cfg = window.ELAYON_CONFIG || {};
  const supabaseUrl = cfg.supabase?.url;
  const supabaseAnonKey = cfg.supabase?.anonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase não configurado.");
    return;
  }

  if (!window.supabase || !window.supabase.createClient) {
    console.warn("SDK do Supabase não carregado.");
    return;
  }

  window.ELAYON_SUPABASE = window.supabase.createClient(
    supabaseUrl,
    supabaseAnonKey
  );
})();