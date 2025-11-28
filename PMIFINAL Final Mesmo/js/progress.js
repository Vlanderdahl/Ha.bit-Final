// Variáveis globais
let habits = [];
let habitLogs = {};
let timeFilter = 'month'; // 'week', 'month', 'quarter', 'year', 'all'

// Elementos DOM
const progressFilter = document.getElementById('progress-filter');
const habitsChartCtx = document.getElementById('habits-chart')?.getContext('2d');
const monthlyChartCtx = document.getElementById('monthly-chart')?.getContext('2d');

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

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await loadHabitsFromSupabase();
    await loadHabitLogsFromSupabase();
    setupEventListeners();
    renderCharts();
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
            logs: {} // Será preenchido com habit_logs
        }));

        console.log("✔ Hábitos carregados para progresso:", habits.length);
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
        habits.forEach(habit => {
            if (habitLogs[habit.id]) {
                habit.logs = habitLogs[habit.id];
            }
        });

        console.log("✔ Logs carregados para progresso");
    } catch (error) {
        console.error("❌ Erro ao carregar logs:", error);
        habitLogs = {};
    }
}

function setupEventListeners() {
    progressFilter.addEventListener('change', (e) => {
        timeFilter = e.target.value;
        renderCharts();
    });
}

function renderCharts() {
    renderHabitsChart();
    renderMonthlyChart();
    updateStats();
}

function renderHabitsChart() {
    // Dados para o gráfico de hábitos
    const habitNames = habits.map(h => h.name);
    const completionRates = habits.map(h => calculateCompletionRate(h));
    
    if (window.habitsChart) {
        window.habitsChart.destroy();
    }
    
    window.habitsChart = new Chart(habitsChartCtx, {
        type: 'bar',
        data: {
            labels: habitNames,
            datasets: [{
                label: 'Taxa de Conclusão',
                data: completionRates,
                backgroundColor: habits.map((h, i) => 
                    `hsl(${(i * 360 / habits.length)}, 70%, 50%)`),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Percentual (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hábitos'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

function renderMonthlyChart() {
    // Dados para o gráfico mensal (últimos 6 meses)
    const months = [];
    const completionData = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(now.getMonth() - i);
        const monthStr = `${getMonthName(date.getMonth())} ${date.getFullYear()}`;
        months.push(monthStr);
        
        // Calcular taxa de conclusão para o mês
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        let totalDays = 0;
        let completedDays = 0;
        
        habits.forEach(habit => {
            if (habit.logs) {
                Object.keys(habit.logs).forEach(dateStr => {
                    const logDate = new Date(dateStr);
                    if (logDate >= startDate && logDate <= endDate) {
                        completedDays++;
                    }
                });
            }
            totalDays += endDate.getDate(); // Total possível = dias no mês * hábitos
        });
        
        const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
        completionData.push(completionRate);
    }
    
    if (window.monthlyChart) {
        window.monthlyChart.destroy();
    }
    
    window.monthlyChart = new Chart(monthlyChartCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Taxa de Conclusão Mensal',
                data: completionData,
                borderColor: '#2d767f',
                backgroundColor: 'rgba(45, 118, 127, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Percentual (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mês'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

function updateStats() {
    // Atualizar estatísticas com base no filtro de tempo
    const stats = calculateStats();
    
    const statCard1 = document.querySelector('.stat-card:nth-child(1) .stat-value');
    const statCard2 = document.querySelector('.stat-card:nth-child(2) .stat-value');
    const statCard3 = document.querySelector('.stat-card:nth-child(3) .stat-value');
    const statCard4 = document.querySelector('.stat-card:nth-child(4) .stat-value');
    
    if (statCard1) {
        statCard1.textContent = `${stats.completionRate}%`;
        const progressBar1 = document.querySelector('.stat-card:nth-child(1) .progress-bar');
        if (progressBar1) progressBar1.style.width = `${stats.completionRate}%`;
    }
    
    if (statCard2) {
        statCard2.textContent = stats.streakDays;
        const progressBar2 = document.querySelector('.stat-card:nth-child(2) .progress-bar');
        if (progressBar2) progressBar2.style.width = `${Math.min(100, stats.streakDays)}%`;
    }
    
    if (statCard3) {
        statCard3.textContent = stats.completedHabits;
        const progressBar3 = document.querySelector('.stat-card:nth-child(3) .progress-bar');
        if (progressBar3) progressBar3.style.width = `${Math.min(100, stats.completedHabits * 10)}%`;
    }
    
    if (statCard4) {
        statCard4.textContent = stats.perfectDays;
        const progressBar4 = document.querySelector('.stat-card:nth-child(4) .progress-bar');
        if (progressBar4) progressBar4.style.width = `${Math.min(100, stats.perfectDays * 10)}%`;
    }

    // Exibir dicas baseadas nos dados de habit_logs
    const tips = generateTips();
    const tipsElement = document.getElementById('progress-tips') || document.querySelector('.progress-tips');
    if (tipsElement) {
        tipsElement.textContent = tips;
    } else {
        // Criar elemento de dicas se não existir
        const tipsContainer = document.querySelector('.main-content') || document.body;
        if (tipsContainer && !document.getElementById('progress-tips')) {
            const tipsDiv = document.createElement('div');
            tipsDiv.id = 'progress-tips';
            tipsDiv.className = 'progress-tips';
            tipsDiv.style.cssText = 'margin: 2rem; padding: 1.5rem; background: #f0f9ff; border-radius: 8px; white-space: pre-line;';
            tipsDiv.textContent = tips;
            tipsContainer.appendChild(tipsDiv);
        }
    }
}

function calculateStats() {
    const now = new Date();
    let startDate;
    
    switch (timeFilter) {
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'quarter':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3);
            break;
        case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        case 'all':
        default:
            startDate = new Date(0); // Data muito antiga
    }
    
    let totalPossible = 0;
    let totalCompleted = 0;
    let streakDays = 0;
    let perfectDays = 0;
    let completedHabits = 0;
    
    // Verificar hábitos completados
    habits.forEach(habit => {
        if (habit.logs) {
            Object.keys(habit.logs).forEach(dateStr => {
                const logDate = new Date(dateStr);
                if (logDate >= startDate && logDate <= now) {
                    totalCompleted++;
                }
            });
        }
    });
    
    // Calcular dias consecutivos
    let currentStreak = 0;
    let currentDate = new Date(now);
    while (currentDate >= startDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const hasLog = habits.some(h => h.logs && h.logs[dateStr]);
        
        if (hasLog) {
            currentStreak++;
            streakDays = Math.max(streakDays, currentStreak);
            
            // Verificar se é um dia "perfeito" (todos hábitos completados no nível avançado)
            const allPerfect = habits.every(h => 
                h.logs && h.logs[dateStr] && h.logs[dateStr] === 'advanced');
            if (allPerfect) perfectDays++;
        } else {
            currentStreak = 0;
        }
        
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // Total possível = número de dias no período * número de hábitos
    const daysInPeriod = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    totalPossible = daysInPeriod * habits.length;
    
    // Hábitos completados pelo menos uma vez no período
    completedHabits = habits.filter(h => {
        if (!h.logs) return false;
        return Object.keys(h.logs).some(dateStr => {
            const logDate = new Date(dateStr);
            return logDate >= startDate && logDate <= now;
        });
    }).length;
    
    const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    
    return {
        completionRate,
        streakDays,
        perfectDays,
        completedHabits
    };
}

function calculateCompletionRate(habit) {
    const now = new Date();
    let startDate;
    
    switch (timeFilter) {
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'quarter':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3);
            break;
        case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        case 'all':
        default:
            startDate = new Date(0); // Data muito antiga
    }
    
    let completed = 0;
    let total = 0;
    
    // Usar logs de habit_logs (já carregados)
    if (habit.logs) {
        Object.keys(habit.logs).forEach(dateStr => {
            const logDate = new Date(dateStr);
            if (logDate >= startDate && logDate <= now) {
                completed++;
            }
        });
    }
    
    // Total possível = número de dias no período
    const daysInPeriod = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    total = daysInPeriod;
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
}

// Função para gerar dicas baseadas nos dados de habit_logs
function generateTips() {
    if (habits.length === 0) {
        return "Comece adicionando hábitos para acompanhar seu progresso!";
    }

    const tips = [];
    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);

    // Analisar cada hábito
    habits.forEach(habit => {
        if (!habit.logs) return;

        const recentLogs = Object.keys(habit.logs).filter(dateStr => {
            const logDate = new Date(dateStr);
            return logDate >= lastWeek;
        });

        const completionRate = calculateCompletionRate(habit);

        if (recentLogs.length === 0) {
            tips.push(`💡 "${habit.name}" - Você não registrou este hábito na última semana. Tente começar pequeno!`);
        } else if (completionRate < 30) {
            tips.push(`💡 "${habit.name}" - Sua taxa de conclusão está baixa (${completionRate}%). Tente estabelecer um horário fixo!`);
        } else if (completionRate >= 70) {
            tips.push(`✅ "${habit.name}" - Excelente! Você está mantendo ${completionRate}% de conclusão. Continue assim!`);
        }
    });

    // Dica geral sobre sequência
    const stats = calculateStats();
    if (stats.streakDays < 3) {
        tips.push("💪 Tente manter uma sequência de pelo menos 3 dias consecutivos para criar um hábito sólido!");
    }

    return tips.length > 0 ? tips.join("\n\n") : "Continue registrando seus hábitos diariamente para ver seu progresso!";
}

function getMonthName(monthIndex) {
    const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return months[monthIndex];
}