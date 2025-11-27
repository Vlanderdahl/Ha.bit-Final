// navigation.js - Gerencia a navegação entre páginas e dados compartilhados

// Atualiza o item ativo no menu
function updateActiveMenuItem() {
    const currentPage = window.location.pathname.split('/').pop();
    const menuItems = document.querySelectorAll('.sidebar nav li');
    
    menuItems.forEach(item => {
        item.classList.remove('active');
        const link = item.querySelector('a');
        if (link.getAttribute('href') === currentPage) {
            item.classList.add('active');
        }
    });
}

// Carrega ou inicializa os dados
// Nota: Hábitos agora vêm 100% do Supabase, não usa mais localStorage
function initializeData() {
    // Não inicializa mais hábitos em localStorage
    // Todos os dados vêm do Supabase
}

    if (!localStorage.getItem('ha-bit-user')) {
        const defaultUser = {
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
        localStorage.setItem('ha-bit-user', JSON.stringify(defaultUser));
    }
}

// Funções utilitárias compartilhadas
function getMonthName(monthIndex) {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIndex];
}

function getCategoryName(categoryKey) {
    const categories = {
        'saude': 'Saúde',
        'aprendizado': 'Aprendizado',
        'produtividade': 'Produtividade',
        'lazer': 'Lazer'
    };
    return categories[categoryKey] || categoryKey;
}

// ============================================
// THEME MANAGEMENT
// ============================================

// Função para alternar o tema
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('ha-bit-theme', newTheme);
    
    // Atualizar ícone do botão
    updateThemeIcon(newTheme);
    
    console.log('Tema alterado para:', newTheme);
}

// Função para atualizar o ícone do botão de tema
function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        } else {
            // Se não encontrar o ícone, criar um
            const newIcon = document.createElement('i');
            newIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            themeToggle.appendChild(newIcon);
        }
    }
}

// Função para carregar o tema salvo
function loadTheme() {
    const savedTheme = localStorage.getItem('ha-bit-theme') || 'light';
    const html = document.documentElement;
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// Função para buscar informações do usuário no Supabase e atualizar sidebar
async function updateUserInfoFromSupabase() {
    try {
        // Importar supabase dinamicamente ou usar window.supabase
        let supabase;
        if (window.supabase) {
            supabase = window.supabase;
        } else {
            const supabaseModule = await import('./supabase/supabaseClient.js');
            supabase = supabaseModule.supabase;
        }
        
        const { data: authData } = await supabase.auth.getUser();
        
        if (!authData?.user) {
            console.warn('⚠ Usuário não autenticado');
            return;
        }

        // Consultar na tabela usuario
        const { data, error } = await supabase
            .from("usuario")
            .select("nome, email_usuario")
            .eq("id_usuario", authData.user.id)
            .single();

        if (error || !data) {
            console.warn('⚠ Erro ao buscar dados do usuário:', error);
            // Fallback para localStorage
            updateUserInfo();
            return;
        }

        const userName = data.nome || 'Usuário';
        const userEmail = data.email_usuario || authData.user.email || 'usuario@email.com';

        // Atualizar no HTML usando classes (compatível com todos os HTMLs)
        const usernameElements = document.querySelectorAll('.user-profile .username');
        const userEmailElements = document.querySelectorAll('.user-profile .user-email');
        
        // Também tentar atualizar por ID se existir
        const sidebarUsername = document.getElementById('sidebar-username');
        const sidebarEmail = document.getElementById('sidebar-email');
        const professionalName = document.getElementById('professional-name');
        const professionalEmail = document.getElementById('professional-email');

        // Atualizar elementos por classe
        usernameElements.forEach(el => {
            el.textContent = userName;
        });

        userEmailElements.forEach(el => {
            el.textContent = userEmail;
        });

        // Atualizar elementos por ID se existirem
        if (sidebarUsername) sidebarUsername.textContent = userName;
        if (sidebarEmail) sidebarEmail.textContent = userEmail;
        if (professionalName) professionalName.textContent = userName;
        if (professionalEmail) professionalEmail.textContent = userEmail;

        // Atualizar localStorage para cache
        localStorage.setItem('userName', userName);
        localStorage.setItem('userEmail', userEmail);

        // Atualizar avatar se não tiver ícone
        const avatarElements = document.querySelectorAll('.user-profile .avatar');
        avatarElements.forEach(el => {
            if (!el.querySelector('i')) {
                el.textContent = userName.charAt(0).toUpperCase();
            }
        });

        console.log('✔ Informações do usuário atualizadas do Supabase');
    } catch (error) {
        console.error('❌ Erro ao atualizar informações do Supabase:', error);
        // Fallback para localStorage
        updateUserInfo();
    }
}

// Tornar função disponível globalmente
window.updateUserInfoFromSupabase = updateUserInfoFromSupabase;

// Função para atualizar informações do usuário no sidebar (fallback para localStorage)
function updateUserInfo() {
    try {
        // Primeiro tentar buscar do localStorage direto (dados do login)
        let userName = localStorage.getItem('userName');
        let userEmail = localStorage.getItem('userEmail');
        
        // Se não encontrar, tentar buscar do ha-bit-user (dados antigos)
        if (!userName || !userEmail) {
            const userDataStr = localStorage.getItem('ha-bit-user');
            if (userDataStr) {
                try {
                    const userData = JSON.parse(userDataStr);
                    if (userData) {
                        userName = userData.name || userName;
                        userEmail = userData.email || userEmail;
                    }
                } catch (e) {
                    console.error('Erro ao parsear ha-bit-user:', e);
                }
            }
        }
        
        // Se ainda não encontrar, usar valores padrão
        if (!userName) userName = 'Usuário';
        if (!userEmail) userEmail = 'usuario@email.com';
        
        // Atualizar todos os elementos de username na sidebar
        const usernameElements = document.querySelectorAll('.user-profile .username');
        if (usernameElements.length > 0) {
            usernameElements.forEach(el => {
                el.textContent = userName;
            });
        }
        
        // Atualizar todos os elementos de email na sidebar
        const userEmailElements = document.querySelectorAll('.user-profile .user-email');
        if (userEmailElements.length > 0) {
            userEmailElements.forEach(el => {
                el.textContent = userEmail;
            });
        }
        
        // Atualizar avatar se não tiver ícone
        const avatarElements = document.querySelectorAll('.user-profile .avatar');
        avatarElements.forEach(el => {
            if (!el.querySelector('i')) {
                el.textContent = userName.charAt(0).toUpperCase();
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar informações do usuário:', error);
    }
}

// Inicialização
async function initNavigation() {
    initializeData();
    updateActiveMenuItem();
    loadTheme();
    
    // Buscar informações do usuário do Supabase
    await updateUserInfoFromSupabase();
    
    // Aguardar um pouco para garantir que o DOM está pronto e tentar novamente
    setTimeout(async () => {
        await updateUserInfoFromSupabase();
    }, 100);
    
    // Atualizar informações do usuário novamente após um pequeno delay
    // para garantir que os elementos estejam no DOM
    setTimeout(async () => {
        await updateUserInfoFromSupabase();
    }, 300);
    
    // Carregar detector de tipo de usuário se disponível
    if (typeof setupProfessionalNavigation === 'function') {
        setupProfessionalNavigation();
    }
    
    // Adicionar evento ao botão de tema - tentar múltiplas vezes se necessário
    function setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            // Remover todos os event listeners anteriores
            themeToggle.onclick = null;
            
            // Adicionar novo event listener
            themeToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleTheme();
            });
            
            console.log('✅ Botão de tema inicializado com sucesso!');
            return true;
        } else {
            console.warn('⚠️ Botão theme-toggle não encontrado, tentando novamente...');
            return false;
        }
    }
    
    // Tentar configurar imediatamente
    if (!setupThemeToggle()) {
        // Se não funcionar, tentar novamente após um pequeno delay
        setTimeout(() => {
            if (!setupThemeToggle()) {
                // Última tentativa após mais tempo
                setTimeout(setupThemeToggle, 500);
            }
        }, 100);
    }
}

// Função para forçar atualização imediata das informações do usuário
function forceUpdateUserInfo() {
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('userEmail');
    
    if (userName || userEmail) {
        console.log('🔄 Forçando atualização imediata:', { userName, userEmail });
        
        // Atualizar diretamente sem esperar
        document.querySelectorAll('.user-profile .username').forEach(el => {
            if (userName) el.textContent = userName;
        });
        
        document.querySelectorAll('.user-profile .user-email').forEach(el => {
            if (userEmail) el.textContent = userEmail;
        });
    }
}

// Executar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initNavigation();
        // Forçar atualização imediata
        setTimeout(forceUpdateUserInfo, 10);
    });
} else {
    // DOM já está pronto
    initNavigation();
    // Forçar atualização imediata
    setTimeout(forceUpdateUserInfo, 10);
}

// Também executar quando a página estiver totalmente carregada
window.addEventListener('load', async () => {
    setTimeout(forceUpdateUserInfo, 50);
    setTimeout(async () => {
        await updateUserInfoFromSupabase();
    }, 100);
});

// Também tentar configurar quando a página estiver totalmente carregada
window.addEventListener('load', function() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && !themeToggle.onclick) {
        themeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
        });
        console.log('✅ Botão de tema configurado no evento load');
    }
    // Atualizar informações do usuário novamente após carregamento completo
    updateUserInfo();
    
    // Aguardar um pouco e atualizar novamente para garantir
    setTimeout(updateUserInfo, 200);
});

// Exportar funções para uso em outros arquivos (compatibilidade)
// Removido export ES6 - usar window.getMonthName e window.getCategoryName se necessário
window.getMonthName = getMonthName;
window.getCategoryName = getCategoryName;