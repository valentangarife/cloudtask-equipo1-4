/**
 * CloudTasks - Configuración de Supabase
 *
 * IMPORTANTE:
 * - Reemplaza los valores de abajo con los de TU proyecto de Supabase
 *   (Project Settings -> API).
 * - SUPABASE_ANON_KEY es la clave pública ("anon"/"public"), diseñada
 *   para usarse en el navegador. NUNCA uses aquí la "service_role key".
 */

const SUPABASE_URL = "https://dpbpnuocjdgpofkcnfwh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Te8sOCYhV-q1MDufndupOQ_RNzCrXmM";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
