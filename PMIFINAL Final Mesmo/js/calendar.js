// Variáveis globais
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let currentView = 'month'; // 'month', 'week', 'day'
let habits = []; // Carregado do Supabase
let habitLogs = {}; // Carregado do Supabase (habit_logs)
let pendingChanges = {}; // Armazena mudanças temporárias antes de salvar
let originalLogs = {}; // Armazena estado original para cancelar

// Importar Supabase
let supabase;
(async () => {
    if (window.supabase) {
        supabase = window.supabase;
    } else {
        const supabaseModule = await import('./supabase/supabaseClient.js');
        supabase = supabaseModule.supabase;
    }
})();

// Elementos DOM
const calendarGrid = document.getElementById('calendar');
const currentMonthElement = document.getElementById('current-month');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const weekView = document.getElementById('week-view');
const monthView = document.getElementById('month-view');
const dayView = document.getElementById('day-view');
const currentWeekElement = document.getElementById('current-week');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const currentDayElement = document.getElementById('current-day');
const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');
const dayTimeline = document.getElementById('day-timeline');
const viewButtons = document.querySelectorAll('.btn-view');
const dayModal = document.getElementById('day-modal');
const dayModalTitle = document.getElementById('day-modal-title');
const dayHabitsList = document.getElementById('day-habits-list');

// Cores para os níveis
const levelColors = {
    basic: "#a8e6cf",
    intermediate: "#dcedc1",
    advanced: "#ffaaa5"
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await loadHabitsFromSupabase();
    await loadHabitLogsFromSupabase();
    setupEventListeners();
    renderCalendar();
});

// Carregar hábitos de usuario_habito
async function loadHabitsFromSupabase() {
    try {
        if (!supabase) {
            if (window.supabase) {
                supabase = window.supabase;
            } else {
                const supabaseModule = await import('./supabase/supabaseClient.js');
                supabase = supabaseModule.supabase;
            }
        }

        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
            console.error("❌ Usuário não autenticado!");
            return;
        }

        const USER_ID = authData.user.id;

        // 1. Buscar hábitos vinculados em usuario_habito
        const { data: vinculos, error: errorVinculos } = await supabase
            .from("usuario_habito")
            .select("id_habito")
            .eq("id_usuario", USER_ID);

        if (errorVinculos || !vinculos || vinculos.length === 0) {
            habits = [];
            return;
        }

        // 2. Buscar detalhes dos hábitos
        const habitIds = vinculos.map(v => v.id_habito);
        const { data: habitos, error: errorHabitos } = await supabase
            .from("habit")
            .select("id_habito, nm_habito, tp_habito")
            .in("id_habito", habitIds);

        if (errorHabitos) {
            console.error("❌ Erro ao buscar hábitos:", errorHabitos);
            habits = [];
            return;
        }

        habits = (habitos || []).map(h => ({
            id: h.id_habito,
            name: h.nm_habito,
            category: h.tp_habito,
            levels: { basic: "Feito!", intermediate: "Bom", advanced: "Perfeito" },
            logs: {} // Será preenchido com habit_logs
        }));

        console.log("✔ Hábitos carregados:", habits.length);
    } catch (error) {
        console.error("❌ Erro ao carregar hábitos:", error);
        habits = [];
    }
}

// Carregar logs de habit_logs
async function loadHabitLogsFromSupabase() {
    try {
        if (!supabase) {
            if (window.supabase) {
                supabase = window.supabase;
            } else {
                const supabaseModule = await import('./supabase/supabaseClient.js');
                supabase = supabaseModule.supabase;
            }
        }

        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
            return;
        }

        const USER_ID = authData.user.id;

        // Buscar todos os logs do usuário
        const { data: logs, error } = await supabase
            .from("habit_logs")
            .select("id_habit, feito_em, nivel_exec")
            .eq("id_usuario", USER_ID);

        if (error) {
            console.error("❌ Erro ao buscar logs:", error);
            habitLogs = {};
            return;
        }

        // Organizar logs por hábito e data
        habitLogs = {};
        (logs || []).forEach(log => {
            const dateStr = new Date(log.feito_em).toISOString().split('T')[0];
            if (!habitLogs[log.id_habit]) {
                habitLogs[log.id_habit] = {};
            }
            // Mapear nivel_exec para os níveis esperados
            const nivel = log.nivel_exec || 'basic';
            habitLogs[log.id_habit][dateStr] = nivel;
        });

        // Atualizar hábitos com logs
        // habit.id é id_habito, habitLogs usa id_habit (que referencia id_habito)
        habits.forEach(habit => {
            // id_habit na tabela habit_logs referencia id_habito da tabela habit
            if (habitLogs[habit.id]) {
                habit.logs = habitLogs[habit.id];
            }
        });

        console.log("✔ Logs carregados");
    } catch (error) {
        console.error("❌ Erro ao carregar logs:", error);
        habitLogs = {};
    }
}

function setupEventListeners() {
    // Navegação do mês
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
    
    // Navegação da semana
    prevWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 7);
        renderWeekView();
    });
    
    nextWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 7);
        renderWeekView();
    });
    
    // Navegação do dia
    prevDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        renderDayView();
    });
    
    nextDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        renderDayView();
    });
    
    // Botões de visualização
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            switchView(currentView);
        });
    });
    
    // Fechar modal
    document.querySelector('.close-btn').addEventListener('click', () => {
        cancelModalChanges();
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === dayModal) {
            cancelModalChanges();
        }
    });
}

function switchView(view) {
    monthView.style.display = 'none';
    weekView.style.display = 'none';
    dayView.style.display = 'none';
    
    if (view === 'month') {
        monthView.style.display = 'block';
        renderCalendar();
    } else if (view === 'week') {
        weekView.style.display = 'block';
        renderWeekView();
    } else if (view === 'day') {
        dayView.style.display = 'block';
        renderDayView();
    }
}

function renderCalendar() {
    currentMonthElement.textContent = `${getMonthName(currentMonth)} ${currentYear}`;
    calendarGrid.innerHTML = '';
    
    // Cabeçalhos dos dias da semana
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Primeiro dia do mês e quantos dias tem o mês
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Dias do mês anterior
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.dataset.date = dateStr;
        
        dayElement.innerHTML = `<span class="day-number">${day}</span>`;
        
        // Container para hábitos do dia
        const habitsContainer = document.createElement('div');
        habitsContainer.className = 'day-habits-container';
        dayElement.appendChild(habitsContainer);
        
        // Hábitos completados neste dia
        habits.forEach(habit => {
            if (habit.logs && habit.logs[dateStr]) {
                const habitMarker = document.createElement('div');
                habitMarker.className = `day-habit day-habit-${habit.logs[dateStr]}`;
                habitMarker.style.backgroundColor = levelColors[habit.logs[dateStr]];
                habitMarker.title = `${habit.name} - ${getLevelName(habit.logs[dateStr])}`;
                
                // Adicionar nome do hábito (truncado se muito longo)
                const habitName = document.createElement('span');
                habitName.className = 'day-habit-name';
                habitName.textContent = habit.name.length > 12 ? habit.name.substring(0, 10) + '...' : habit.name;
                habitMarker.appendChild(habitName);
                
                // Adicionar ícone do nível
                const levelIcon = document.createElement('i');
                levelIcon.className = getLevelIcon(habit.logs[dateStr]);
                habitMarker.appendChild(levelIcon);
                
                habitsContainer.appendChild(habitMarker);
            }
        });
        
        // Destacar dia atual
        const today = new Date();
        if (currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate()) {
            dayElement.style.border = `2px solid ${levelColors.advanced}`;
        }
        
        dayElement.addEventListener('click', () => openDayModal(dateStr));
        calendarGrid.appendChild(dayElement);
    }
}

function renderWeekView() {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    currentWeekElement.textContent = `Semana ${weekStart.getDate()} - ${weekEnd.getDate()} ${getMonthName(weekEnd.getMonth())} ${weekEnd.getFullYear()}`;
    
    const weekDaysContainer = document.getElementById('week-days');
    weekDaysContainer.innerHTML = '';
    
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        
        const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        const dayElement = document.createElement('div');
        dayElement.className = 'week-day';
        
        // Destacar dia atual
        const today = new Date();
        if (day.getDate() === today.getDate() && 
            day.getMonth() === today.getMonth() && 
            day.getFullYear() === today.getFullYear()) {
            dayElement.classList.add('week-day-today');
        }
        
        dayElement.innerHTML = `<div class="week-day-number">${day.getDate()}</div>`;
        
        // Hábitos para este dia
        habits.forEach(habit => {
            if (habit.logs && habit.logs[dayStr]) {
                const habitElement = document.createElement('div');
                habitElement.className = 'week-day-habit';
                habitElement.textContent = habit.name;
                habitElement.style.backgroundColor = levelColors[habit.logs[dayStr]];
                dayElement.appendChild(habitElement);
            }
        });
        
        dayElement.addEventListener('click', () => openDayModal(dayStr));
        weekDaysContainer.appendChild(dayElement);
    }
}

function renderDayView() {
    const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const dayName = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][currentDate.getDay()];
    
    currentDayElement.textContent = `${dayName}, ${currentDate.getDate()} ${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`;
    dayTimeline.innerHTML = '';
    
    // Criar slots de tempo
    for (let hour = 5; hour < 22; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `${String(hour).padStart(2, '0')}:00`;
        
        const timeContent = document.createElement('div');
        timeContent.className = 'time-content';
        
        // Hábitos agendados para este horário (simulação)
        if (hour === 8) {
            habits.forEach(habit => {
                if (habit.logs && habit.logs[dayStr]) {
                    const habitItem = document.createElement('div');
                    habitItem.className = 'habit-time-item';
                    habitItem.style.backgroundColor = levelColors[habit.logs[dayStr]];
                    habitItem.innerHTML = `
                        <span>${habit.name} - ${habit.levels[habit.logs[dayStr]]}</span>
                        <button class="remove-habit-time" data-habit-id="${habit.id}" data-date="${dayStr}">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    timeContent.appendChild(habitItem);
                }
            });
        }
        
        timeSlot.appendChild(timeLabel);
        timeSlot.appendChild(timeContent);
        dayTimeline.appendChild(timeSlot);
    }
}

function openDayModal(dateStr) {
    const date = new Date(dateStr);
    const formattedDate = `${date.getDate()} de ${getMonthName(date.getMonth())} de ${date.getFullYear()}`;
    
    // Resetar mudanças pendentes e salvar estado original
    pendingChanges = {};
    originalLogs = {};
    habits.forEach(habit => {
        if (habit.logs && habit.logs[dateStr]) {
            originalLogs[habit.id] = habit.logs[dateStr];
        } else {
            originalLogs[habit.id] = null;
        }
    });
    
    dayModalTitle.innerHTML = `Registro para <span id="modal-date">${formattedDate}</span>`;
    dayHabitsList.innerHTML = '';
    
    habits.forEach(habit => {
        const currentLevel = habit.logs && habit.logs[dateStr] ? habit.logs[dateStr] : null;
        
        const habitItem = document.createElement('div');
        habitItem.className = 'day-habit-item';
        habitItem.dataset.habitId = habit.id;
        
        habitItem.innerHTML = `
            <div class="day-habit-info">
                <strong>${habit.name}</strong>
                <small>${getCategoryName(habit.category)}</small>
            </div>
            <div class="day-habit-actions">
                <div class="level-selector">
                    <button class="level-selector-btn ${currentLevel === 'basic' ? 'selected' : ''}" 
                            style="background-color: ${levelColors.basic}" 
                            data-habit-id="${habit.id}" 
                            data-level="basic">Feito</button>
                    <button class="level-selector-btn ${currentLevel === 'intermediate' ? 'selected' : ''}" 
                            style="background-color: ${levelColors.intermediate}" 
                            data-habit-id="${habit.id}" 
                            data-level="intermediate">Bem Feito</button>
                    <button class="level-selector-btn ${currentLevel === 'advanced' ? 'selected' : ''}" 
                            style="background-color: ${levelColors.advanced}" 
                            data-habit-id="${habit.id}" 
                            data-level="advanced">Perfeito</button>
                </div>
                <button class="remove-habit" data-habit-id="${habit.id}" data-date="${dateStr}" title="Remover">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        dayHabitsList.appendChild(habitItem);
    });
    
    // Adicionar rodapé do modal com botões de ação
    const modalContent = dayModal.querySelector('.modal-content');
    let modalFooter = modalContent.querySelector('.modal-footer');
    if (!modalFooter) {
        modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        modalContent.appendChild(modalFooter);
    }
    
    modalFooter.innerHTML = `
        <div class="modal-footer-content">
            <button class="btn-secondary cancel-btn" id="cancel-modal-btn">
                <i class="fas fa-times"></i>
                Cancelar
            </button>
            <button class="btn-primary save-btn" id="save-modal-btn" disabled>
                <i class="fas fa-save"></i>
                Salvar Alterações
            </button>
        </div>
    `;
    
    // Eventos para os botões de nível
    document.querySelectorAll('.level-selector-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const habitId = parseInt(btn.dataset.habitId);
            const level = btn.dataset.level;
            
            // Armazenar mudança temporariamente
            pendingChanges[habitId] = level;
            
            // Atualizar visualização
            document.querySelectorAll(`.level-selector-btn[data-habit-id="${habitId}"]`).forEach(b => {
                b.classList.remove('selected');
            });
            btn.classList.add('selected');
            
            // Habilitar botão de salvar
            updateSaveButton();
        });
    });
    
    // Eventos para remover hábitos
    document.querySelectorAll('.remove-habit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const habitId = parseInt(btn.dataset.habitId);
            // Marcar para remoção
            pendingChanges[habitId] = null;
            
            // Atualizar visualização - remover seleção de todos os botões deste hábito
            document.querySelectorAll(`.level-selector-btn[data-habit-id="${habitId}"]`).forEach(b => {
                b.classList.remove('selected');
            });
            
            // Adicionar indicador visual de que será removido
            const habitItem = document.querySelector(`.day-habit-item[data-habit-id="${habitId}"]`);
            if (habitItem) {
                habitItem.classList.add('pending-removal');
            }
            
            // Habilitar botão de salvar
            updateSaveButton();
        });
    });
    
    // Eventos dos botões do rodapé
    document.getElementById('save-modal-btn').addEventListener('click', async () => {
        await saveModalChanges(dateStr);
    });
    
    document.getElementById('cancel-modal-btn').addEventListener('click', () => {
        cancelModalChanges();
    });
    
    dayModal.style.display = 'flex';
    updateSaveButton();
}

function updateSaveButton() {
    const saveBtn = document.getElementById('save-modal-btn');
    if (!saveBtn) return;
    
    const hasChanges = Object.keys(pendingChanges).length > 0;
    saveBtn.disabled = !hasChanges;
    
    if (hasChanges) {
        saveBtn.classList.add('has-changes');
    } else {
        saveBtn.classList.remove('has-changes');
    }
}

async function saveModalChanges(dateStr) {
    try {
        if (!supabase) {
            if (window.supabase) {
                supabase = window.supabase;
            } else {
                const supabaseModule = await import('./supabase/supabaseClient.js');
                supabase = supabaseModule.supabase;
            }
        }

        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
            alert("❌ Usuário não autenticado!");
            return;
        }

        const USER_ID = authData.user.id;
        const dateObj = new Date(dateStr);
        dateObj.setHours(12, 0, 0, 0); // Meio-dia para evitar problemas de timezone
        const dateStrFormatted = dateObj.toISOString().split('T')[0];

        // Processar todas as mudanças pendentes
        const promises = [];
        
        Object.keys(pendingChanges).forEach(habitIdStr => {
            const habitId = parseInt(habitIdStr);
            const level = pendingChanges[habitId];
            const habitIndex = habits.findIndex(h => h.id === habitId);
            
            if (habitIndex === -1) return;

            if (level === null) {
                // Remover log - deletar de habit_logs
                promises.push(
                    supabase
                        .from("habit_logs")
                        .delete()
                        .eq("id_usuario", USER_ID)
                        .eq("id_habit", habitId)
                        .eq("feito_em", dateStrFormatted)
                );
                
                // Atualizar localmente
                if (habits[habitIndex].logs) {
                    delete habits[habitIndex].logs[dateStr];
                }
            } else {
                // Adicionar/atualizar log - inserir ou atualizar em habit_logs
                promises.push(
                    supabase
                        .from("habit_logs")
                        .upsert({
                            id_usuario: USER_ID,
                            id_habit: habitId,
                            feito_em: dateStrFormatted,
                            nivel_exec: level
                        }, {
                            onConflict: 'id_usuario,id_habit,feito_em'
                        })
                );
                
                // Atualizar localmente
                if (!habits[habitIndex].logs) {
                    habits[habitIndex].logs = {};
                }
                habits[habitIndex].logs[dateStr] = level;
            }
        });

        // Executar todas as operações
        await Promise.all(promises);
        
        renderCalendar();
        renderWeekView();
        
        // Limpar mudanças pendentes e fechar modal
        pendingChanges = {};
        originalLogs = {};
        dayModal.style.display = 'none';
        
        // Mostrar mensagem de sucesso
        showSuccessMessage('Alterações salvas com sucesso!');
        
        // Se estiver na visualização de dia, atualizar também
        if (currentView === 'day') {
            renderDayView();
        }
    } catch (error) {
        console.error("❌ Erro ao salvar logs:", error);
        alert("Erro ao salvar alterações!");
    }
}

function cancelModalChanges() {
    // Verificar se há mudanças não salvas
    const hasChanges = Object.keys(pendingChanges).length > 0;
    
    if (hasChanges) {
        // Confirmar cancelamento
        if (confirm('Você tem alterações não salvas. Deseja realmente cancelar? Todas as alterações serão perdidas.')) {
            // Reverter mudanças visuais
            Object.keys(originalLogs).forEach(habitIdStr => {
                const habitId = parseInt(habitIdStr);
                const originalLevel = originalLogs[habitId];
                
                // Atualizar botões para estado original
                document.querySelectorAll(`.level-selector-btn[data-habit-id="${habitId}"]`).forEach(btn => {
                    btn.classList.remove('selected');
                    if (btn.dataset.level === originalLevel) {
                        btn.classList.add('selected');
                    }
                });
                
                // Remover indicador de remoção pendente
                const habitItem = document.querySelector(`.day-habit-item[data-habit-id="${habitId}"]`);
                if (habitItem) {
                    habitItem.classList.remove('pending-removal');
                }
            });
            
            // Limpar mudanças pendentes e fechar modal
            pendingChanges = {};
            originalLogs = {};
            dayModal.style.display = 'none';
        }
    } else {
        // Sem mudanças, apenas fechar
        pendingChanges = {};
        originalLogs = {};
        dayModal.style.display = 'none';
    }
}

function updateHabitLog(habitId, dateStr, level) {
    const habitIndex = habits.findIndex(h => h.id === habitId);
    
    if (habitIndex !== -1) {
        if (!habits[habitIndex].logs) {
            habits[habitIndex].logs = {};
        }
        habits[habitIndex].logs[dateStr] = level;
        saveHabits();
        renderCalendar();
        renderWeekView();
    }
}

function removeHabitLog(habitId, dateStr) {
    const habitIndex = habits.findIndex(h => h.id === habitId);
    
    if (habitIndex !== -1 && habits[habitIndex].logs && habits[habitIndex].logs[dateStr]) {
        delete habits[habitIndex].logs[dateStr];
        saveHabits();
        renderCalendar();
        renderWeekView();
    }
}

function showSuccessMessage(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success calendar-alert';
    alert.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => {
            alert.remove();
        }, 500);
    }, 3000);
}

// Função saveHabits removida - agora usa habit_logs no Supabase
// Mantida apenas para compatibilidade se necessário
function saveHabits() {
    // Não salva mais em localStorage - usa habit_logs
    console.log("⚠ saveHabits() chamada mas não salva mais em localStorage");
}

// Funções auxiliares
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

function getLevelName(level) {
    const levels = {
        'basic': 'Feito',
        'intermediate': 'Bem Feito',
        'advanced': 'Perfeito'
    };
    return levels[level] || level;
}

function getLevelIcon(level) {
    const icons = {
        'basic': 'fas fa-check',
        'intermediate': 'fas fa-check-circle',
        'advanced': 'fas fa-star'
    };
    return icons[level] || 'fas fa-check';
}