const SUPABASE_URL = "https://eudcjihffrfmhzmfwtlg.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZGNqaWhmZnJmbWh6bWZ3dGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDE3MjUsImV4cCI6MjA5MDMxNzcyNX0.2tod6vvl_4SAXzSmW1wU8Mk9pLn8fvhF2xrAZOysUu0";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let _userId = null;

// ==========================
// PROTEÇÃO TOTAL
// ==========================

async function proteger() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    window.location.href = "login.html";
    return null;
  }

  return data.user;
}

// ==========================
// PREENCHER PERFIL
// ==========================

function preencher(user) {
  const nome = user.user_metadata?.nome || "Usuário";

  document.getElementById("welcomeTitle").textContent =
    `Bem-vindo ao Elayon Space, ${nome}.`;

  document.getElementById("userName").textContent = nome;
  document.getElementById("userEmail").textContent = user.email;
  document.getElementById("userPlan").textContent = "Padrão";
  document.getElementById("userAccessStatus").textContent = "Autenticado";
}

// ==========================
// LIBERAR FERRAMENTAS
// ==========================

function liberarFerramentas() {
  document.getElementById("btnToolPresenca").disabled = false;
  document.getElementById("btnToolFalaLivre").disabled = false;
  document.getElementById("btnToolTreino").disabled = false;
  document.getElementById("btnToolRelatorio").disabled = false;
}

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

// ==========================
// LOGOUT
// ==========================

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}

// ==========================
// BOTÕES
// ==========================

function eventos() {
  document.getElementById("btnLogout")?.addEventListener("click", logout);

  document.getElementById("btnIniciar")?.addEventListener("click", () => {
    liberarFerramentas();
    alert("Simbiose iniciada.");
  });

  document.getElementById("btnToolPresenca")?.addEventListener("click", () => {
    alert("Abrindo módulo Presença...");
  });
}

// ==========================
// START
// ==========================

document.addEventListener("DOMContentLoaded", async () => {
  const user = await proteger();

  if (!user) return;

  _userId = user.id;
  preencher(user);
  await exibirTokens(user.id);
  eventos();
});
