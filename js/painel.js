const SUPABASE_URL = "https://eudcjihffrfmhzmfwtlg.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZGNqaWhmZnJmbWh6bWZ3dGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDE3MjUsImV4cCI6MjA5MDMxNzcyNX0.2tod6vvl_4SAXzSmW1wU8Mk9pLn8fvhF2xrAZOysUu0";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

  preencher(user);
  eventos();
});