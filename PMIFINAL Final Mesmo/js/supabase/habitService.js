// js/supabase/habitService.js
import { supabase } from "./supabaseClient.js";

// 🔹 INSERIR HÁBITO NO BANCO
export async function salvarHabitoBanco(habito) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return console.warn("⚠ Usuário não logado");

  const idUsuario = sessionData.session.user.id;

  const { error } = await supabase.from("habit").insert([
    {
      nm_habito: habito.name,
      tp_habito: habito.category,
      id_usuario: idUsuario,
    },
  ]);

  if (error) console.error("❌ Erro ao inserir hábito:", error);
  else console.log("✔ Hábito salvo no Supabase!");
}

// 🔹 BUSCAR HÁBITOS DO USUÁRIO
export async function listarHabitosDoUsuario() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return [];

  const idUsuario = sessionData.session.user.id;

  const { data, error } = await supabase
    .from("habit")
    .select("*")
    .eq("id_usuario", idUsuario);

  if (error) {
    console.error("❌ Erro ao buscar hábitos:", error);
    return [];
  }

  return data;
}


export async function deletarHabitoBanco(idHabito) {
  return await supabase
    .from("habit")
    .delete()
    .eq("id_habito", idHabito);
}

