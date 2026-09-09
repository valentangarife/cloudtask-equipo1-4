/**
 * CloudTasks - Configuración de Supabase
 *
 * IMPORTANTE:
 * - Reemplaza los valores de abajo con los de TU proyecto de Supabase
 *   (Project Settings -> API).
 * - SUPABASE_ANON_KEY es la clave pública ("anon"/"public"), diseñada
 *   para usarse en el navegador. NUNCA uses aquí la "service_role key".
 * - Este archivo se sube a GitHub (no contiene secretos), pero si en el
 *   futuro usas claves privadas, agrégalas a variables de entorno y
 *   este archivo a .gitignore.
 */

const SUPABASE_URL = "https://uyduqeekspjoacqlgueq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZHVxZWVrc3Bqb2FjcWxndWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzY1NDAsImV4cCI6MjEwNDU1MjU0MH0.4uyKGhxIceG-KalWla6RUvbV8hNUK-YsJI3HtSmrxo4";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);