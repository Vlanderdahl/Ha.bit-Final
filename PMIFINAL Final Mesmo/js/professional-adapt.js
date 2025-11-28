// professional-adapt.js - Adapta páginas para visualização profissional

let sidebarAdapted = false; // Flag para evitar adaptação múltipla

async function initProfessionalAdaptation() {
    // Verificar se é profissional buscando do banco de dados
    const { supabase } = await import('./supabase/supabaseClient.js');
    
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
        return; // Não está logado, não fazer nada
    }

    const USER_ID = sessionData.session.user.id;
    const { data: userData, error } = await supabase
        .from("usuario")
        .select("tp_usuario")
        .eq("id_usuario", USER_ID)
        .single();

    if (error || !userData) {
        console.warn("⚠ Tipo de usuário NÃO encontrado no banco!");
        return;
    }

    // Só continuar se for profissional (tp_usuario === 2)
    if (userData.tp_usuario !== 2) {
        return; // Não é profissional, não adaptar
    }
    
    const currentPage = window.location.pathname.split('/').pop();
    
    // Redirecionar se necessário (apenas index.html)
    if (currentPage === 'index.html') {
        window.location.href = 'index-professional.html';
        return;
    }
    
    // Resetar flag quando a página muda
    sidebarAdapted = false;
    
    // Aguardar DOM estar pronto antes de adaptar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            adaptPages(currentPage);
        });
    } else {
        // DOM já está pronto
        adaptPages(currentPage);
    }
}

function adaptPages(currentPage) {
    // Não adaptar se já estiver na página profissional
    if (currentPage === 'index-professional.html') {
        // Apenas atualizar informações do usuário
        updateSidebarForProfessional();
        setTimeout(() => {
            updateProfessionalUserInfo();
            if (typeof updateUserInfo === 'function') {
                updateUserInfo();
            }
        }, 300);
        return;
    }
    
    // Adaptar páginas existentes APENAS se não for index.html
    // Nunca adaptar index.html - redirecionar imediatamente
    if (currentPage === 'calendar.html') {
        adaptCalendarPage();
    } else if (currentPage === 'progress.html') {
        adaptProgressPage();
    } else if (currentPage === 'settings.html') {
        adaptSettingsPage();
    }
    
    // Atualizar sidebar APENAS se não for index.html
    if (currentPage !== 'index.html') {
        updateSidebarForProfessional();
        
        // Garantir que as informações do usuário sejam atualizadas
        setTimeout(() => {
            updateProfessionalUserInfo();
        }, 300);
    }
}

// Executar imediatamente (agora é async)
initProfessionalAdaptation().catch(error => {
    console.error("❌ Erro ao inicializar adaptação profissional:", error);
});

function updateSidebarForProfessional() {
    // Evitar execução múltipla
    if (sidebarAdapted) return;
    
    // Aguardar um pouco para garantir que o DOM está pronto
    setTimeout(() => {
        // Adicionar classe professional-theme ao body
        document.body.classList.add('professional-theme');
        
        // Atualizar links e remover calendário
        const sidebarLinks = document.querySelectorAll('.sidebar nav a');
        sidebarLinks.forEach(link => {
            const href = link.getAttribute('href');
            const listItem = link.closest('li');
            
            // Atualizar link do dashboard para pacientes
            if (href === 'index.html' || href === 'index-professional.html') {
                link.setAttribute('href', 'index-professional.html');
                const span = link.querySelector('span');
                if (span) {
                    const text = span.textContent.trim();
                    if (text === 'Dashboard' || text === 'Pacientes') {
                        span.textContent = 'Pacientes';
                    }
                }
                const icon = link.querySelector('i');
                if (icon) {
                    if (icon.classList.contains('fa-home') || icon.classList.contains('fa-users')) {
                        icon.className = 'fas fa-users';
                    }
                }
            }
            
            // Remover item de calendário se existir
            if (href === 'calendar.html' && listItem) {
                listItem.remove();
            }
            
            // Atualizar texto de Progresso para Relatórios
            if (href === 'progress.html') {
                const span = link.querySelector('span');
                if (span && span.textContent.trim() === 'Progresso') {
                    span.textContent = 'Relatórios';
                }
            }
        });
        
        // Atualizar avatar
        const avatars = document.querySelectorAll('.avatar');
        avatars.forEach(avatar => {
            const icon = avatar.querySelector('i');
            if (icon && icon.classList.contains('fa-user')) {
                icon.className = 'fas fa-user-md';
            }
        });
        
        // Atualizar nome e email do profissional
        updateProfessionalUserInfo();
        
        // Marcar como adaptado
        sidebarAdapted = true;
    }, 100);
}

function updateProfessionalUserInfo() {
    // Obter nome e email do localStorage (dados do login)
    let userName = localStorage.getItem('userName');
    let userEmail = localStorage.getItem('userEmail');
    
    // Se não encontrar, usar valores padrão
    if (!userName) userName = 'Profissional';
    if (!userEmail) userEmail = 'profissional@email.com';
    
    // Atualizar username e user-email em todas as páginas
    const usernameElements = document.querySelectorAll('.user-profile .username');
    const userEmailElements = document.querySelectorAll('.user-profile .user-email');
    
    usernameElements.forEach(el => {
        el.textContent = userName;
    });
    
    userEmailElements.forEach(el => {
        el.textContent = userEmail;
    });
}

function adaptCalendarPage() {
    // Aguardar um pouco para garantir que o DOM está pronto
    setTimeout(() => {
        // Mudar título
        const header = document.querySelector('.main-header h1');
        if (header) {
            header.textContent = 'Calendário de Pacientes';
        }
        
        const subtitle = document.querySelector('.header-subtitle');
        if (subtitle) {
            subtitle.textContent = 'Visualize o progresso dos hábitos de seus pacientes';
        }
        
        // Adicionar seletor de paciente
        const headerContent = document.querySelector('.header-content');
        if (headerContent && !document.getElementById('patient-selector')) {
            const selectDiv = document.createElement('div');
            selectDiv.className = 'patient-selector-container';
            selectDiv.innerHTML = `
                <label for="patient-selector">
                    <i class="fas fa-user"></i>
                    Selecionar Paciente
                </label>
                <select id="patient-selector" class="patient-selector">
                    <option value="all">Todos os Pacientes</option>
                </select>
            `;
            const viewOptions = headerContent.querySelector('.view-options');
            if (viewOptions && viewOptions.parentElement) {
                viewOptions.parentElement.insertBefore(selectDiv, viewOptions);
            } else if (headerContent) {
                headerContent.appendChild(selectDiv);
            }
            
            // Carregar pacientes
            loadPatientsForSelector();
        }
    }, 100);
}

function adaptProgressPage() {
    // Aguardar um pouco para garantir que o DOM está pronto
    setTimeout(() => {
        // Mudar título
        const header = document.querySelector('.main-header h1');
        if (header) {
            header.textContent = 'Relatórios de Pacientes';
        }
        
        const subtitle = document.querySelector('.header-subtitle');
        if (subtitle) {
            subtitle.textContent = 'Acompanhe estatísticas e evolução dos seus pacientes';
        }
        
        // Adicionar seletor de paciente
        const headerContent = document.querySelector('.header-content');
        if (headerContent && !document.getElementById('patient-selector-progress')) {
            const selectDiv = document.createElement('div');
            selectDiv.className = 'patient-selector-container';
            selectDiv.innerHTML = `
                <label for="patient-selector-progress">
                    <i class="fas fa-user"></i>
                    Paciente
                </label>
                <select id="patient-selector-progress" class="patient-selector">
                    <option value="all">Todos os Pacientes</option>
                </select>
            `;
            const timeFilter = document.querySelector('.time-filter');
            if (timeFilter && timeFilter.parentElement) {
                timeFilter.parentElement.insertBefore(selectDiv, timeFilter);
            } else if (headerContent) {
                headerContent.appendChild(selectDiv);
            }
            
            loadPatientsForSelector('patient-selector-progress');
        }
    }, 100);
}

function adaptSettingsPage() {
    // Aguardar um pouco para garantir que o DOM está pronto
    setTimeout(() => {
        // Mudar título
        const header = document.querySelector('.main-header h1');
        if (header) {
            header.textContent = 'Configurações Profissionais';
        }
        
        const subtitle = document.querySelector('.header-subtitle');
        if (subtitle) {
            subtitle.textContent = 'Gerencie suas configurações profissionais';
        }
    }, 100);
}

function loadPatientsForSelector(selectorId = 'patient-selector') {
    const patients = JSON.parse(localStorage.getItem('ha-bit-patients')) || [];
    const select = document.getElementById(selectorId);
    
    if (!select) return;
    
    // Limpar opções existentes (exceto "Todos")
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Adicionar pacientes
    patients.forEach(patient => {
        const option = document.createElement('option');
        option.value = patient.id;
        option.textContent = patient.name;
        select.appendChild(option);
    });
    
    // Adicionar evento de mudança
    select.addEventListener('change', (e) => {
        const patientId = e.target.value;
        if (patientId === 'all') {
            // Mostrar todos os pacientes
            console.log('Mostrando todos os pacientes');
        } else {
            // Filtrar por paciente específico
            console.log('Filtrando paciente:', patientId);
        }
    });
}

