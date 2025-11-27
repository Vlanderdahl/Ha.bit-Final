const API_BASE_URL = window.AUTH_API_URL || 'http://localhost:3000/api/auth';

// Verificar se usuário já está logado
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (token) {console.log('Usuário já autenticado');}
});

// SUPABASE INTEGRAÇÃO LOGIN
// Nota: O login principal está sendo gerenciado em js/supabase/authSupabase.js
// Este arquivo mantém compatibilidade caso seja necessário
import { tentarLoginSupabase } from './supabase/authSupabase.js';

// Verificar se existe formulário de login (caso este arquivo seja usado em outro contexto)
const loginForm = document.querySelector('.login-form');
if(loginForm){
 const handler = async (event)=>{
   event.preventDefault();
   const fd=new FormData(loginForm);
   const email=fd.get('email'),password=fd.get('password');
   const ok=await tentarLoginSupabase(email,password);
   if(!ok){ /* fallback original code could run here */ }
 };
 loginForm.addEventListener('submit',handler);
}
