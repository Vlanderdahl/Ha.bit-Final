// Elementos DOM
const settingsMenu = document.querySelectorAll('.settings-menu li');
const settingsTabs = document.querySelectorAll('.settings-tab');
const avatarPreview = document.getElementById('avatar-preview');
const uploadAvatarBtn = document.getElementById('upload-avatar');
const profileForm = document.getElementById('profile-tab form');
const accountForm = document.getElementById('account-tab form');
const notificationsForm = document.getElementById('notifications-tab form');
const appearanceForm = document.getElementById('appearance-tab form');
const privacyForm = document.getElementById('privacy-tab form');
const deleteAccountBtn = document.getElementById('account-delete');
const exportDataBtn = document.getElementById('privacy-data');

// Dados do usuário
let userData = JSON.parse(localStorage.getItem('ha-bit-user')) || {
    name: 'Usuário',
    email: 'usuario@exemplo.com',
    bio: 'Entusiasta de hábitos saudáveis e produtivos!',
    username: 'usuario123',
    language: 'pt',
    timezone: '-3',
    notifications: {
        email: true,
        push: true,
        daily: false,
        time: '08:00'
    },
    appearance: {
        theme: 'system',
        accentColor: '#2d767f'
    },
    privacy: {
        publicProfile: false,
        shareStats: true
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    setupEventListeners();
});

function loadUserData() {
    // Carregar dados do perfil
    document.getElementById('profile-name').value = userData.name;
    document.getElementById('profile-email').value = userData.email;
    document.getElementById('profile-bio').value = userData.bio;
    
    // Atualizar avatar preview
    updateAvatarPreview();
    
    // Carregar dados da conta
    document.getElementById('account-username').value = userData.username;
    document.getElementById('account-language').value = userData.language;
    document.getElementById('account-timezone').value = userData.timezone;
    
    // Carregar configurações de notificação
    document.querySelector('#notifications-tab input[type="checkbox"]:nth-child(1)').checked = userData.notifications.email;
    document.querySelector('#notifications-tab input[type="checkbox"]:nth-child(2)').checked = userData.notifications.push;
    document.querySelector('#notifications-tab input[type="checkbox"]:nth-child(3)').checked = userData.notifications.daily;
    document.getElementById('notification-time').value = userData.notifications.time;
    document.getElementById('notification-time').disabled = !userData.notifications.daily;
    
    // Carregar aparência
    document.querySelector(`.theme-option[data-theme="${userData.appearance.theme}"]`).classList.add('active');
    document.querySelector(`input[name="accent-color"][value="${userData.appearance.accentColor}"]`).checked = true;
    
    // Carregar privacidade
    document.querySelector('#privacy-tab input[type="checkbox"]:nth-child(1)').checked = userData.privacy.publicProfile;
    document.querySelector('#privacy-tab input[type="checkbox"]:nth-child(2)').checked = userData.privacy.shareStats;
}

function setupEventListeners() {
    // Menu de configurações
    settingsMenu.forEach(item => {
        item.addEventListener('click', () => {
            settingsMenu.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const tabId = `${item.dataset.tab}-tab`;
            settingsTabs.forEach(tab => tab.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Upload de avatar
    uploadAvatarBtn.addEventListener('click', () => {
        document.getElementById('profile-avatar').click();
    });
    
    document.getElementById('profile-avatar').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                userData.avatar = event.target.result;
                saveUserData();
                updateAvatarPreview();
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Formulários
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userData.name = document.getElementById('profile-name').value;
        userData.email = document.getElementById('profile-email').value;
        userData.bio = document.getElementById('profile-bio').value;
        saveUserData();
        showAlert('Perfil atualizado com sucesso!');
    });
    
    accountForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userData.username = document.getElementById('account-username').value;
        userData.language = document.getElementById('account-language').value;
        userData.timezone = document.getElementById('account-timezone').value;
        saveUserData();
        showAlert('Configurações da conta atualizadas!');
    });
    
    notificationsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userData.notifications = {
            email: document.querySelector('#notifications-tab input[type="checkbox"]:nth-child(1)').checked,
            push: document.querySelector('#notifications-tab input[type="checkbox"]:nth-child(2)').checked,
            daily: document.querySelector('#notifications-tab input[type="checkbox"]:nth-child(3)').checked,
            time: document.getElementById('notification-time').value
        };
        saveUserData();
        showAlert('Configurações de notificação atualizadas!');
    });
    
    // Habilitar/desabilitar horário de lembretes
    document.querySelector('#notifications-tab input[type="checkbox"]:nth-child(3)').addEventListener('change', (e) => {
        document.getElementById('notification-time').disabled = !e.target.checked;
    });
    
    appearanceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userData.appearance = {
            theme: document.querySelector('.theme-option.active').dataset.theme,
            accentColor: document.querySelector('input[name="accent-color"]:checked').value
        };
        saveUserData();
        showAlert('Configurações de aparência atualizadas!');
        applyTheme();
    });
    
    // Seleção de tema
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
        });
    });
    
    privacyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userData.privacy = {
            publicProfile: document.querySelector('#privacy-tab input[type="checkbox"]:nth-child(1)').checked,
            shareStats: document.querySelector('#privacy-tab input[type="checkbox"]:nth-child(2)').checked
        };
        saveUserData();
        showAlert('Configurações de privacidade atualizadas!');
    });
    
    // Botão para excluir conta
    deleteAccountBtn.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja excluir sua conta permanentemente? Todos os seus dados serão perdidos.')) {
            // Nota: Exclusão real da conta deve ser feita no Supabase Auth
            // Aqui apenas limpa dados locais de configurações
            localStorage.removeItem('ha-bit-user');
            showAlert('Sua conta foi excluída. Redirecionando...', true);
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 2000);
        }
    });
    
    // Botão para exportar dados - busca do Supabase
    exportDataBtn.addEventListener('click', async () => {
        try {
            // Importar Supabase
            let supabase;
            if (window.supabase) {
                supabase = window.supabase;
            } else {
                const supabaseModule = await import('./supabase/supabaseClient.js');
                supabase = supabaseModule.supabase;
            }

            const { data: authData } = await supabase.auth.getUser();
            if (!authData?.user) {
                showAlert('Erro: usuário não autenticado!', false);
                return;
            }

            const USER_ID = authData.user.id;

            // Buscar dados do usuário
            const { data: usuarioData } = await supabase
                .from("usuario")
                .select("*")
                .eq("id_usuario", USER_ID)
                .single();

            // Buscar hábitos vinculados
            const { data: vinculos } = await supabase
                .from("usuario_habito")
                .select("id_habito")
                .eq("id_usuario", USER_ID);

            const habitIds = vinculos?.map(v => v.id_habito) || [];
            const { data: habitos } = await supabase
                .from("habit")
                .select("*")
                .in("id_habito", habitIds);

            // Buscar logs
            const { data: logs } = await supabase
                .from("habit_logs")
                .select("*")
                .eq("id_usuario", USER_ID);

            const data = {
                user: usuarioData,
                habits: habitos || [],
                habitLogs: logs || [],
                exportedAt: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `ha-bit-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showAlert('Seus dados foram exportados com sucesso!');
        } catch (error) {
            console.error("Erro ao exportar dados:", error);
            showAlert('Erro ao exportar dados!', false);
        }
    });
}

function updateAvatarPreview() {
    if (userData.avatar) {
        avatarPreview.innerHTML = `<img src="${userData.avatar}" alt="Avatar">`;
    } else {
        avatarPreview.innerHTML = `<div class="avatar">${userData.name.charAt(0).toUpperCase()}</div>`;
    }
}

function saveUserData() {
    localStorage.setItem('ha-bit-user', JSON.stringify(userData));
}

function applyTheme() {
    // Aplicar tema (simplificado - na prática você precisaria adicionar classes ao body)
    const root = document.documentElement;
    root.style.setProperty('--primary-color', userData.appearance.accentColor);
    
    // Aqui você pode adicionar mais lógica para mudar entre temas claro/escuro
}

function showAlert(message, isSuccess = true) {
    const alert = document.createElement('div');
    alert.className = `alert ${isSuccess ? 'alert-success' : 'alert-error'}`;
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => {
            alert.remove();
        }, 500);
    }, 3000);
}