const SUPABASE_URL = "https://eudcjihffrfmhzmfwtlg.supabase.co";
const SUPABASE_KEY = "COLE_AQUI_A_ANON_KEY_COMPLETA";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function carregarUsuario() {
  const welcomeTitle = document.getElementById("welcomeTitle");
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const userPlan = document.getElementById("userPlan");
  const userAccessStatus = document.getElementById("userAccessStatus");

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      window.location.href = "login.html";
      return;
    }

    const user = data.user;
    const nome = user.user_metadata?.nome || "Usuário";
    const email = user.email || "Sem e-mail";

    welcomeTitle.textContent = `Bem-vindo ao Elayon Space, ${nome}.`;
    userName.textContent = nome;
    userEmail.textContent = email;
    userPlan.textContent = "Padrão";
    userAccessStatus.textContent = "Autenticado";
  } catch (e) {
    console.error("Erro ao carregar usuário:", e);
    window.location.href = "login.html";
  }
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}

function ligarBotoes() {
  const btnLogout = document.getElementById("btnLogout");
  const btnAbrirPresenca = document.getElementById("btnAbrirPresenca");
  const btnPerfil = document.getElementById("btnPerfil");

  const btnToolPresenca = document.getElementById("btnToolPresenca");
  const btnToolFalaLivre = document.getElementById("btnToolFalaLivre");
  const btnToolTreino = document.getElementById("btnToolTreino");
  const btnToolRelatorio = document.getElementById("btnToolRelatorio");

  btnLogout?.addEventListener("click", logout);

  btnAbrirPresenca?.addEventListener("click", () => {
    window.location.href = "presenca.html";
  });

  btnPerfil?.addEventListener("click", () => {
    alert("Área de perfil em construção.");
  });

  btnToolPresenca?.addEventListener("click", () => {
    window.location.href = "presenca.html";
  });

  btnToolFalaLivre?.addEventListener("click", () => {
    alert("Fala livre será conectada na próxima etapa.");
  });

  btnToolTreino?.addEventListener("click", () => {
    alert("Treinamento vocal será conectado na próxima etapa.");
  });

  btnToolRelatorio?.addEventListener("click", () => {
    alert("Relatório Lion será conectado na próxima etapa.");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await carregarUsuario();
  ligarBotoes();
});