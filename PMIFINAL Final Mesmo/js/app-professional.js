// js/app-professional.js - LISTAR PACIENTES PARA O PROFISSIONAL
import { supabase } from "./supabase/supabaseClient.js";

const container = document.getElementById("patients-container");

// Carregar TODOS os pacientes disponíveis (para vincular) - não vinculados
async function carregarPacientes() {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    console.error("❌ Não está logado!");
    window.location.href = "auth.html";
    return;
  }

  const ID_PROFISSIONAL = authData.user.id;

  // Buscar pacientes vinculados ao profissional
  const { data: vinculados } = await supabase
    .from("profissional_paciente")
    .select("id_paciente")
    .eq("id_profissional", ID_PROFISSIONAL);

  const idsVinculados = vinculados?.map(v => v.id_paciente) || [];

  // Buscar todos os pacientes (tp_usuario = 1)
  const { data: todosPacientes, error } = await supabase
    .from("usuario")
    .select("id_usuario, nome, email_usuario")
    .eq("tp_usuario", 1);

  if (error) {
    console.error("❌ Erro ao buscar pacientes:", error);
    container.innerHTML = "<p>Erro ao carregar pacientes</p>";
    return;
  }

  // Filtrar pacientes que NÃO estão vinculados
  const data = todosPacientes?.filter(p => !idsVinculados.includes(p.id_usuario)) || [];

  if (error) {
    console.error("❌ Erro ao buscar pacientes:", error);
    container.innerHTML = "<p>Erro ao carregar pacientes</p>";
    return;
  }

  renderPacientes(data || []);
}

// Renderizar na tela (tabela e grid)
async function renderPacientes(pacientes) {
  const tableBody = document.getElementById("patients-table-body");
  container.innerHTML = "";
  
  if (tableBody) {
    tableBody.innerHTML = "";
  }

  if (!pacientes.length) {
    container.innerHTML = `<p>Nenhum paciente encontrado.</p>`;
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">Nenhum paciente encontrado.</td></tr>`;
    }
    return;
  }

  // Buscar informações adicionais de cada paciente
  const pacientesComInfo = await Promise.all(
    pacientes.map(async (p) => {
      // Buscar hábitos vinculados do paciente via usuario_habito
      const { data: vinculos } = await supabase
        .from("usuario_habito")
        .select("id_habito")
        .eq("id_usuario", p.id_usuario);
      
      const habitIds = vinculos?.map(v => v.id_habito) || [];
      const totalHabitos = habitIds.length;

      // Taxa de conclusão baseada em logs dos últimos 30 dias
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      const { data: logsRecentes } = await supabase
        .from("habit_logs")
        .select("id_log, feito_em")
        .eq("id_usuario", p.id_usuario)
        .gte("feito_em", thirtyDaysAgo.toISOString().split('T')[0]);

      const logsUltimos30Dias = logsRecentes?.length || 0;
      const diasPossiveis = totalHabitos * 30;
      const taxaConclusao = diasPossiveis > 0 ? Math.round((logsUltimos30Dias / diasPossiveis) * 100) : 0;

      // Calcular sequência (dias consecutivos com pelo menos um log)
      let sequencia = 0;
      if (logsRecentes && logsRecentes.length > 0) {
        const datasComLog = new Set();
        logsRecentes.forEach(log => {
          const dataLog = new Date(log.feito_em);
          datasComLog.add(dataLog.toISOString().split('T')[0]);
        });
        
        let diaAtual = new Date(now);
        while (datasComLog.has(diaAtual.toISOString().split('T')[0])) {
          sequencia++;
          diaAtual.setDate(diaAtual.getDate() - 1);
        }
      }

      return {
        ...p,
        totalHabitos,
        taxaConclusao: Math.min(100, taxaConclusao),
        sequencia
      };
    })
  );

  // Renderizar na tabela
  if (tableBody) {
    pacientesComInfo.forEach(p => {
      const row = document.createElement("tr");
      const nomePaciente = p.nome || "Sem nome";
      const emailPaciente = p.email_usuario || p.email || "Sem email";
      
      row.innerHTML = `
        <td>
          <div class="patient-info">
            <strong>${nomePaciente}</strong>
            <small>${emailPaciente}</small>
          </div>
        </td>
        <td>${p.totalHabitos} hábitos</td>
        <td>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${p.taxaConclusao}%"></div>
            <span>${p.taxaConclusao}%</span>
          </div>
        </td>
        <td>${p.sequencia} dias</td>
        <td>
          <span class="status-badge ${p.taxaConclusao >= 70 ? 'active' : p.taxaConclusao >= 40 ? 'needs-attention' : 'inactive'}">
            ${p.taxaConclusao >= 70 ? 'Ativo' : p.taxaConclusao >= 40 ? 'Atenção' : 'Inativo'}
          </span>
        </td>
        <td>
          <button class="btn-habitos btn-small" data-id="${p.id_usuario}" title="Ver Hábitos">
            <i class="fas fa-list"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  // Renderizar no grid (mantém compatibilidade)
  pacientesComInfo.forEach(p => {
    const jaVinculado = true; // Se está na lista, já está vinculado
    const card = document.createElement("div");
    card.className = "patient-card";

    const nomePaciente = p.nome || "Sem nome";
    const emailPaciente = p.email_usuario || p.email || "Sem email";

    card.innerHTML = `
      <h3>${nomePaciente}</h3>
      <p>Email: ${emailPaciente}</p>
      <div class="patient-stats">
        <span>${p.totalHabitos} hábitos</span>
        <span>${p.taxaConclusao}% conclusão</span>
      </div>
      <div class="actions">
        <button class="btn-habitos" data-id="${p.id_usuario}">
          📋 Ver Hábitos
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  // EVENTOS - Usar delegação de eventos para funcionar com tabela e grid
  // Os event listeners já estão configurados globalmente abaixo
}


// Buscar hábitos do paciente no Supabase - apenas hábitos vinculados em usuario_habito
async function carregarHabitosDoPaciente(patientId) {
  // 1. Buscar hábitos vinculados em usuario_habito
  const { data: vinculos, error: errorVinculos } = await supabase
    .from("usuario_habito")
    .select("id_habito")
    .eq("id_usuario", patientId);

  if (errorVinculos) {
    console.error("Erro ao buscar vínculos:", errorVinculos);
    document.getElementById("habits-list").innerHTML = "<p>Erro ao carregar hábitos!</p>";
    return;
  }

  if (!vinculos || vinculos.length === 0) {
    document.getElementById("habits-list").innerHTML = "<p>Este paciente ainda não tem hábitos vinculados.</p>";
    return;
  }

  // 2. Buscar detalhes dos hábitos
  const habitIds = vinculos.map(v => v.id_habito);
  const { data, error } = await supabase
    .from("habit")
    .select("nm_habito, tp_habito")
    .in("id_habito", habitIds);

  if (error) {
    console.error("Erro ao carregar hábitos:", error);
    document.getElementById("habits-list").innerHTML = "<p>Erro ao carregar hábitos!</p>";
    return;
  }

  renderHabitosModal(data);
}

// Renderizar hábitos no modal
function renderHabitosModal(habitos) {
  const list = document.getElementById("habits-list");
  list.innerHTML = "";

  if (!habitos.length) {
    list.innerHTML = "<p>Este paciente ainda não tem hábitos cadastrados.</p>";
  } else {
    habitos.forEach(h => {
      const div = document.createElement("div");
      div.className = "habit-item";
      div.innerHTML = `<p><strong>${h.nm_habito}</strong> — <em>${h.tp_habito}</em></p>`;
      list.appendChild(div);
    });
  }

  document.getElementById("habits-modal").style.display = "flex";
}

// EVENTOS GLOBAIS - Delegação de eventos para botões de pacientes
document.addEventListener("click", async (e) => {
  // Botão ver hábitos (antigo)
  if (e.target.classList.contains("btn-ver-habitos")) {
    const idPaciente = e.target.dataset.id;
    await carregarHabitosDoPaciente(idPaciente);
  }
  
  // Botão hábitos (novo - funciona com tabela e grid)
  if (e.target.closest(".btn-habitos")) {
    const btn = e.target.closest(".btn-habitos");
    const idPaciente = btn.dataset.id;
    if (idPaciente) {
      await carregarHabitosDoPaciente(idPaciente);
    }
  }
  
  // Botão vincular (se ainda existir)
  if (e.target.closest(".btn-vincular")) {
    const btn = e.target.closest(".btn-vincular");
    await vincularPaciente(btn.dataset.id);
    await carregarPacientes();
  }
});

// FECHAR MODAL (FORA DA FUNÇÃO!)
document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("habits-modal").style.display = "none";
});

async function getVinculosDoProfissional() {
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("profissional_paciente")
    .select("id_paciente")
    .eq("id_profissional", authData.user.id);

  return data?.map(v => v.id_paciente) || [];
}


// Função para vincular paciente (atualizada para retornar boolean)
async function vincularPaciente(idPaciente) {
  const { data: authData } = await supabase.auth.getUser();
  const idProfissional = authData.user.id;

  // VERIFICA SE JÁ EXISTE
  const { data: existing } = await supabase
    .from("profissional_paciente")
    .select("*")
    .eq("id_profissional", idProfissional)
    .eq("id_paciente", idPaciente)
    .maybeSingle();

  if (existing) {
    alert("⚠ Esse paciente já está vinculado a você!");
    return false;
  }

  // INSERT REAL
  const { error } = await supabase
    .from("profissional_paciente")
    .insert([{ id_profissional: idProfissional, id_paciente: idPaciente }]);

  if (error) {
    alert("Erro ao vincular paciente!");
    console.error("Erro:", error);
    return false;
  } else {
    // Buscar nome do paciente para exibir
    const { data: pacienteData } = await supabase
      .from("usuario")
      .select("nome")
      .eq("id_usuario", idPaciente)
      .single();
    
    const nomePaciente = pacienteData?.nome || "Paciente";
    alert(`Paciente "${nomePaciente}" vinculado com sucesso! 🎉`);
    return true;
  }
}

// LISTAR APENAS PACIENTES VINCULADOS AO PROFISSIONAL
async function carregarMeusPacientes() {
  const { data: authData } = await supabase.auth.getUser();
  const ID_PROFISSIONAL = authData.user.id;

  const { data, error } = await supabase
    .from("profissional_paciente")
    .select(`
      id_paciente,
      usuario!profissional_paciente_id_paciente_fkey (
        id_usuario,
        nome,
        email_usuario
      )
    `)
    .eq("id_profissional", ID_PROFISSIONAL);

  if (error) {
    console.error("ERRO AO LISTAR VINCULADOS:", error);
    return;
  }

  // Mapear dados para formato esperado
  const pacientes = (data || []).map(p => ({
    id_usuario: p.usuario?.id_usuario,
    nome: p.usuario?.nome,
    email_usuario: p.usuario?.email_usuario
  }));

  renderPacientes(pacientes);
}




// INICIAR - Carregar pacientes vinculados por padrão
document.addEventListener("DOMContentLoaded", async () => {
  await carregarMeusPacientes(); // Carrega pacientes vinculados ao invés de todos
});

// FILTROS DE PACIENTES
document.getElementById("btn-todos").addEventListener("click", async () => {
  await carregarPacientes();
});
document.getElementById("btn-vinculados").addEventListener("click", async () => {
  await carregarMeusPacientes();
});

// MODAL DE CADASTRAR PACIENTE
const addPatientBtn = document.getElementById("add-patient-btn");
const patientModal = document.getElementById("patient-modal");
const patientForm = document.getElementById("patient-form");
const patientEmailInput = document.getElementById("patient-email");
const patientNameInput = document.getElementById("patient-name");
const patientNameGroup = document.getElementById("patient-name-group");

// Abrir modal ao clicar no botão
if (addPatientBtn) {
  addPatientBtn.addEventListener("click", () => {
    patientModal.style.display = "flex";
    patientForm.reset();
    patientNameGroup.style.display = "none";
    patientEmailInput.focus();
  });
}

// Fechar modal
const closeModalBtns = document.querySelectorAll(".close-btn, .close-modal");
closeModalBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    patientModal.style.display = "none";
    patientForm.reset();
    patientNameGroup.style.display = "none";
  });
});

// Fechar modal ao clicar fora
window.addEventListener("click", (e) => {
  if (e.target === patientModal) {
    patientModal.style.display = "none";
    patientForm.reset();
    patientNameGroup.style.display = "none";
  }
});

// Buscar paciente ao digitar e-mail (debounce)
let searchTimeout;
patientEmailInput?.addEventListener("input", async (e) => {
  const email = e.target.value.trim();
  
  clearTimeout(searchTimeout);
  
  if (!email || !email.includes("@")) {
    patientNameGroup.style.display = "none";
    return;
  }
  
  // Aguardar 500ms após parar de digitar
  searchTimeout = setTimeout(async () => {
    await buscarPacientePorEmail(email);
  }, 500);
});

// Função para buscar paciente por e-mail
async function buscarPacientePorEmail(emailDigitado) {
  try {
      const { data: usuario, error } = await supabase
        .from("usuario")
        .select("id_usuario, nome")
        .eq("email_usuario", emailDigitado)
        .eq("tp_usuario", 1) // Garantir que é paciente
        .single();

        if (error || !usuario) {
            // Paciente não encontrado
            patientNameGroup.style.display = "none";
            return false;
        }

        // Paciente encontrado - exibir nome
        const nomePaciente = usuario.nome || "Paciente";
    patientNameInput.value = nomePaciente;
    patientNameGroup.style.display = "block";
    
    // Armazenar id do paciente no formulário para uso posterior
    patientForm.dataset.patientId = usuario.id_usuario;
    
    return true;
  } catch (error) {
    console.error("Erro ao buscar paciente:", error);
    patientNameGroup.style.display = "none";
    return false;
  }
}

// Submeter formulário - criar vínculo
patientForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const emailDigitado = patientEmailInput.value.trim();
  
  if (!emailDigitado) {
    alert("Por favor, digite o e-mail do paciente!");
    return;
  }

  // Buscar paciente
  const pacienteEncontrado = await buscarPacientePorEmail(emailDigitado);
  
  if (!pacienteEncontrado) {
    alert("Paciente não encontrado no banco");
    return;
  }

  const idPaciente = patientForm.dataset.patientId;
  
  if (!idPaciente) {
    alert("Erro ao identificar paciente!");
    return;
  }

  // Criar vínculo
  const sucesso = await vincularPaciente(idPaciente);
  
  if (sucesso) {
    // Fechar modal e recarregar lista
    patientModal.style.display = "none";
    patientForm.reset();
    patientNameGroup.style.display = "none";
    await carregarPacientes();
  }
});


