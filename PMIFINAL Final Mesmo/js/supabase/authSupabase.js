// js/supabase/authSupabase.js
import { supabase } from "./supabaseClient.js";

// SIGNUP (cadastro)
document.querySelector(".signup-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const email = form.email.value;
  const password = form.password.value;
  const name = form.name.value;
  const userType = form.userType.value; // patient | professional

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, userType } },
  });

  if (error) {
    alert("Erro ao criar conta: " + error.message);
    return;
  }

  await registrarUsuarioNaTabela(data.user);
  alert("✔ Conta criada com sucesso!");

  // Buscar tp_usuario do banco após registro para garantir redirecionamento correto
  const USER_ID = data.user.id;
  const { data: userData, error: userError } = await supabase
    .from("usuario")
    .select("tp_usuario, nome, email_usuario")
    .eq("id_usuario", USER_ID)
    .single();

  if (!userError && userData) {
    // Salvar informações no localStorage
    localStorage.setItem('userType', userData.tp_usuario === 2 ? 'professional' : 'patient');
    localStorage.setItem('tp_usuario', userData.tp_usuario.toString());
    localStorage.setItem('userName', userData.nome || name);
    localStorage.setItem('userEmail', userData.email_usuario || email);

    // Redirecionar baseado no tp_usuario do banco
    if (userData.tp_usuario === 2) {
      window.location.href = "index-professional.html";
    } else {
      window.location.href = "index.html";
    }
  } else {
    // Fallback: usar userType do formulário se não conseguir buscar do banco
    window.location.href = userType === "professional"
      ? "index-professional.html"
      : "index.html";
  }
});

// SALVA CORRETAMENTE NO BANCO!
async function registrarUsuarioNaTabela(user) {
  const { id, email, user_metadata } = user;

  const { error } = await supabase.from("usuario").insert([
    {
      id_usuario: id,                                      // uuid
      nome: user_metadata?.name || "Sem Nome",             // text
      email_usuario: email,                                // text
      tp_usuario: user_metadata?.userType === "professional" ? 2 : 1 // int8
    },
  ]);

  if (error) {
    alert("❌ ERRO AO SALVAR NA TABELA usuario: " + error.message);
  } else {
    console.log("✔ Usuário SALVO com sucesso no banco!");
  }
}

// FUNÇÃO PARA TENTAR LOGIN E BUSCAR TIPO DE USUÁRIO DO BANCO
export async function tentarLoginSupabase(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert("Login incorreto ou usuário não registrado!");
      return false;
    }

    // Buscar tp_usuario do banco de dados
    const USER_ID = data.user.id;
    const { data: userData, error: userError } = await supabase
      .from("usuario")
      .select("tp_usuario, nome, email_usuario")
      .eq("id_usuario", USER_ID)
      .single();

    if (userError || !userData) {
      console.error("❌ Erro ao buscar tipo de usuário:", userError);
      alert("Erro ao buscar informações do usuário!");
      return false;
    }

    // Salvar informações no localStorage
    localStorage.setItem('userType', userData.tp_usuario === 2 ? 'professional' : 'patient');
    localStorage.setItem('tp_usuario', userData.tp_usuario.toString());
    localStorage.setItem('userName', userData.nome || '');
    localStorage.setItem('userEmail', userData.email_usuario || email);

    // Atualizar sidebar se a função estiver disponível (será atualizado após redirecionamento)
    // A função updateUserInfoFromSupabase será chamada automaticamente pelo navigation.js

    // Redirecionar baseado no tp_usuario do banco
    if (userData.tp_usuario === 2) {
      window.location.href = "index-professional.html";
    } else {
      window.location.href = "index.html";
    }

    return true;
  } catch (error) {
    console.error("❌ Erro no login:", error);
    alert("Erro ao fazer login!");
    return false;
  }
}

// LOGIN
document.querySelector(".login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const email = form.email.value;
  const password = form.password.value;

  await tentarLoginSupabase(email, password);
});
