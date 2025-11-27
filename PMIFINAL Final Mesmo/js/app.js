// app.js FINAL – SEU CÓDIGO ORIGINAL + SUPABASE + EDITAR HÁBITO 💚
import { supabase } from "./supabase/supabaseClient.js";

let habits = [];
const habitsContainer = document.getElementById('habits-container');
const habitModal = document.getElementById('habit-modal');
const habitForm = document.getElementById('habit-form');
const closeModalBtns = document.querySelectorAll('.close-btn');
const newHabitBtn = document.getElementById('new-habit-btn');

// FECHAR MODAL
closeModalBtns.forEach(btn => {
  btn.addEventListener('click', () => habitModal.style.display = 'none');
});

window.addEventListener('click', (e) => {
  if (e.target === habitModal) habitModal.style.display = 'none';
});

// INICIAR TELA
document.addEventListener("DOMContentLoaded", async () => {
  await carregarHabitosSupabase();
  renderHabits();
});

// 🔹 BUSCAR DO SUPABASE - Apenas hábitos vinculados em usuario_habito
async function carregarHabitosSupabase() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    console.error("❌ Usuário não autenticado!");
    return;
  }

  const USER_ID = authData.user.id;

  // 1. Buscar hábitos vinculados em usuario_habito
  const { data: vinculos, error: errorVinculos } = await supabase
    .from("usuario_habito")
    .select("id_habito")
    .eq("id_usuario", USER_ID);

  if (errorVinculos) {
    console.error("❌ ERRO AO BUSCAR VÍNCULOS:", errorVinculos);
    habits = [];
    renderHabits();
    return;
  }

  if (!vinculos || vinculos.length === 0) {
    habits = [];
    renderHabits();
    return;
  }

  // 2. Buscar detalhes dos hábitos vinculados
  const habitIds = vinculos.map(v => v.id_habito);
  const { data: habitos, error: errorHabitos } = await supabase
    .from("habit")
    .select("id_habito, nm_habito, tp_habito, id_usuario")
    .in("id_habito", habitIds);

  if (errorHabitos) {
    console.error("❌ ERRO AO BUSCAR HÁBITOS:", errorHabitos);
    habits = [];
    renderHabits();
    return;
  }

  // 3. Mapear hábitos (garantir que só mostra hábitos do próprio usuário ou vinculados)
  habits = (habitos || []).map(h => ({
    id: h.id_habito,
    name: h.nm_habito,
    category: h.tp_habito,
    id_usuario: h.id_usuario,
    levels: { basic: "Feito!", intermediate: "Bom", advanced: "Perfeito" }
  }));

  renderHabits();
}

// 🔹 EXIBIR HÁBITOS NA TELA
function renderHabits() {
  habitsContainer.innerHTML = "";

  if (!habits.length) {
    habitsContainer.innerHTML = `
      <div class="no-habits">
        <i class="fas fa-clipboard-list"></i>
        <p>Nenhum hábito cadastrado ainda</p>
        <p class="hint">Clique em "Novo Hábito" para começar</p>
      </div>
    `;
    return;
  }

  habits.forEach(habit => {
    const habitCard = document.createElement("div");
    habitCard.className = "habit-card";
    habitCard.dataset.id = habit.id;

    habitCard.innerHTML = `
      <div class="habit-header">
        <span class="habit-title">${habit.name}</span>
        <span class="habit-category">${habit.category}</span>
      </div>
      <div class="habit-actions">
        <button class="btn-edit" data-id="${habit.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-delete" data-id="${habit.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    habitsContainer.appendChild(habitCard);
  });

  // EVENTO DELETAR
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const habitId = btn.dataset.id;
      await deleteHabit(habitId);
    });
  });

  // EVENTO EDITAR
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const habitId = btn.dataset.id;
      await editHabit(habitId);
    });
  });
}

// Função saveHabitsLocal removida - não usa mais localStorage
// Todos os dados vêm do Supabase

// ADICIONAR HÁBITO - Cria hábito e vincula em usuario_habito
async function addNewHabit() {
  const name = document.getElementById("habit-name").value.trim();
  const category = document.getElementById("habit-category").value;

  if (!name) return alert("Digite um nome!");

  const { data: authData } = await supabase.auth.getUser();
  const USER_ID = authData.user.id;

  // 1. Criar hábito na tabela habit
  const { data: habitData, error: errorHabit } = await supabase
    .from("habit")
    .insert([{ nm_habito: name, tp_habito: category, id_usuario: USER_ID }])
    .select()
    .single();

  if (errorHabit) {
    console.error("❌ Erro ao salvar hábito:", errorHabit);
    return alert("Erro ao salvar hábito!");
  }

  // 2. Vincular hábito em usuario_habito
  const { error: errorVinculo } = await supabase
    .from("usuario_habito")
    .insert([{ id_usuario: USER_ID, id_habito: habitData.id_habito }]);

  if (errorVinculo) {
    console.error("❌ Erro ao vincular hábito:", errorVinculo);
    // Tentar remover o hábito criado se o vínculo falhar
    await supabase.from("habit").delete().eq("id_habito", habitData.id_habito);
    return alert("Erro ao vincular hábito!");
  }

  showAlert("Hábito criado e vinculado com sucesso!");
  habitModal.style.display = "none";
  await carregarHabitosSupabase();
}


// EDITAR HÁBITO – ABRIR MODAL
async function editHabit(habitId) {
  const { data, error } = await supabase
    .from("habit")
    .select("*")
    .eq("id_habito", habitId)
    .single();

  if (error || !data) {
    console.error("❌ Erro ao buscar hábito:", error);
    return;
  }

  document.getElementById("habit-name").value = data.nm_habito;
  document.getElementById("habit-category").value = data.tp_habito;
  habitForm.dataset.editId = habitId;
  habitModal.style.display = "flex";
}


// ATUALIZAR NO SUPABASE
async function updateHabit(habitId) {
  const name = document.getElementById("habit-name").value.trim();
  const category = document.getElementById("habit-category").value.trim();

  if (!name) {
    alert("Digite um nome para o hábito!");
    return;
  }

  const { error } = await supabase
    .from("habit")
    .update({ nm_habito: name, tp_habito: category })
    .eq("id_habito", habitId);

  if (error) {
    console.error("❌ Erro ao atualizar:", error);
    alert("Erro na edição!");
    return;
  }

  habitModal.style.display = "none";
  await carregarHabitosSupabase();
  showAlert("Hábito atualizado!");
}


// DELETAR HÁBITO - Só deleta se for do próprio usuário
async function deleteHabit(habitId) {
  const { data: authData } = await supabase.auth.getUser();
  const USER_ID = authData.user.id;

  // Verificar se o hábito pertence ao usuário ou está vinculado a ele
  const { data: vinculo } = await supabase
    .from("usuario_habito")
    .select("*")
    .eq("id_usuario", USER_ID)
    .eq("id_habito", habitId)
    .single();

  if (!vinculo) {
    alert("⚠ Você não tem permissão para excluir este hábito!");
    return;
  }

  // Verificar se o hábito foi criado pelo próprio usuário
  const { data: habitData } = await supabase
    .from("habit")
    .select("id_usuario")
    .eq("id_habito", habitId)
    .single();

  if (!habitData || habitData.id_usuario !== USER_ID) {
    // Se não foi criado pelo usuário, apenas remove o vínculo
    const { error: errorRemoveVinculo } = await supabase
      .from("usuario_habito")
      .delete()
      .eq("id_usuario", USER_ID)
      .eq("id_habito", habitId);

    if (errorRemoveVinculo) {
      console.error("Erro ao remover vínculo:", errorRemoveVinculo);
      alert("Erro ao remover hábito!");
      return;
    }

    showAlert("Hábito removido da sua lista!");
    await carregarHabitosSupabase();
    return;
  }

  // Se foi criado pelo usuário, remove vínculo e hábito
  const { error: errorRemoveVinculo } = await supabase
    .from("usuario_habito")
    .delete()
    .eq("id_usuario", USER_ID)
    .eq("id_habito", habitId);

  if (errorRemoveVinculo) {
    console.error("Erro ao remover vínculo:", errorRemoveVinculo);
  }

  const { error: errorDelete } = await supabase
    .from("habit")
    .delete()
    .eq("id_habito", habitId);

  if (errorDelete) {
    console.error("Erro ao deletar:", errorDelete);
    alert("Erro ao deletar hábito!");
    return;
  }

  showAlert("Hábito deletado com sucesso!");
  await carregarHabitosSupabase();
}


// SUBMIT DO FORMULÁRIO
habitForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (habitForm.dataset.editId) {
    await updateHabit(habitForm.dataset.editId);
    habitForm.dataset.editId = ""; // Reseta modo edição
  } else {
    await addNewHabit();
  }

  habitForm.reset();
});


// ABRIR MODAL DE NOVO HÁBITO
newHabitBtn?.addEventListener("click", () => {
  habitForm.reset();
  habitForm.dataset.editId = "";
  habitModal.style.display = "flex";
});


// ALERTA VISUAL
function showAlert(msg, ok = true) {
  const alert = document.createElement('div');
  alert.className = `alert ${ok ? 'alert-success' : 'alert-error'}`;
  alert.innerHTML = `<i class="fas ${ok ? 'fa-check' : 'fa-times'}"></i> ${msg}`;
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 2000);
}
