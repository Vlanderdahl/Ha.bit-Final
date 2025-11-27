
import { supabase } from './supabaseClient.js';

export async function vincularHabitoUsuario(id_usuario, id_habito) {
    return await supabase
        .from('usuario_habito')
        .insert([{ id_usuario, id_habito }]);
}

export async function listarHabitosVinculados(id_usuario) {
    const { data, error } = await supabase
        .from('usuario_habito')
        .select('id_habito')
        .eq('id_usuario', id_usuario);
    if (error) console.error(error);
    return data;
}
