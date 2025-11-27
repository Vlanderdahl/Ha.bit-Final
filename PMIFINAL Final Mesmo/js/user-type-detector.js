// js/user-type-detector.js
import { supabase } from "./supabase/supabaseClient.js";

async function redirectByUserType() {
    try {
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData?.session) {
            window.location.href = "auth.html";
            return;
        }

        const USER_ID = sessionData.session.user.id;

        const { data, error } = await supabase
            .from("usuario")
            .select("tp_usuario, nome, email_usuario")
            .eq("id_usuario", USER_ID)
            .single();

        if (error || !data) {
            console.warn("⚠ Tipo de usuário NÃO encontrado no banco!");
            return;
        }

        // Atualizar localStorage com dados do banco
        localStorage.setItem('userType', data.tp_usuario === 2 ? 'professional' : 'patient');
        localStorage.setItem('tp_usuario', data.tp_usuario.toString());
        if (data.nome) localStorage.setItem('userName', data.nome);
        if (data.email_usuario) localStorage.setItem('userEmail', data.email_usuario);

        const currentPage = window.location.pathname;
        const currentPageName = currentPage.split('/').pop();

        // Garantir que paciente (tp_usuario === 1) nunca vá para dashboard profissional
        if (data.tp_usuario === 1) {
            if (currentPageName === "index-professional.html") {
                console.log("⚠ Paciente tentando acessar dashboard profissional. Redirecionando...");
                window.location.href = "index.html";
                return;
            }
            // Se estiver em index.html, está correto
            if (currentPageName === "index.html") {
                console.log("✔ Paciente na página correta!");
                return;
            }
        }

        // Garantir que profissional (tp_usuario === 2) nunca vá para dashboard de paciente
        if (data.tp_usuario === 2) {
            if (currentPageName === "index.html") {
                console.log("⚠ Profissional tentando acessar dashboard de paciente. Redirecionando...");
                window.location.href = "index-professional.html";
                return;
            }
            // Se estiver em index-professional.html, está correto
            if (currentPageName === "index-professional.html") {
                console.log("✔ Profissional na página correta!");
                return;
            }
        }

        // Para outras páginas (calendar, progress, settings), NUNCA redirecionar
        // Apenas garantir que o tipo está correto no localStorage
        const otherPages = ['calendar.html', 'progress.html', 'settings.html'];
        if (otherPages.includes(currentPageName)) {
            console.log("✔ Página de funcionalidade - tipo verificado mas não redirecionando:", data.tp_usuario === 2 ? 'Profissional' : 'Paciente');
            return; // Não fazer nada, apenas verificar
        }

        console.log("✔ Tipo de usuário verificado:", data.tp_usuario === 2 ? 'Profissional' : 'Paciente');
    } catch (error) {
        console.error("❌ Erro ao verificar tipo de usuário:", error);
    }
}

redirectByUserType();
