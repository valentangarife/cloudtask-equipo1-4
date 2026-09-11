/**
 * CloudTasks - Autenticación (login.html)
 * Maneja el inicio de sesión y el registro con Supabase Auth.
 */

(() => {
  "use strict";

  const alertBox = document.getElementById("auth-alert");

  const loginView = document.getElementById("login-view");
  const registerView = document.getElementById("register-view");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginSubmit = document.getElementById("login-submit");
  const registerSubmit = document.getElementById("register-submit");

  // ---------------------------------------------------------------
  // Si ya hay una sesión activa, no tiene sentido ver el login.
  // ---------------------------------------------------------------
  async function redirectIfLoggedIn() {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
      window.location.replace("index.html");
    }
  }
  redirectIfLoggedIn();

  // ---------------------------------------------------------------
  // Utilidades de UI
  // ---------------------------------------------------------------
  function showAlert(message, type = "danger") {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
  }

  function hideAlert() {
    alertBox.className = "alert d-none";
  }

  function setLoading(button, loading, label) {
    button.disabled = loading;
    button.innerHTML = loading
      ? `<span class="spinner-border spinner-border-sm me-2"></span>${label}`
      : label;
  }

  document.getElementById("show-register").addEventListener("click", () => {
    hideAlert();
    loginView.classList.add("d-none");
    registerView.classList.remove("d-none");
  });

  document.getElementById("show-login").addEventListener("click", () => {
    hideAlert();
    registerView.classList.add("d-none");
    loginView.classList.remove("d-none");
  });

  // ---------------------------------------------------------------
  // Traducción de errores comunes de Supabase Auth
  // ---------------------------------------------------------------
  function translateError(message) {
    const map = {
      "Invalid login credentials": "Correo o contraseña incorrectos.",
      "User already registered": "Ya existe una cuenta con ese correo.",
      "Password should be at least 6 characters":
        "La contraseña debe tener al menos 6 caracteres.",
      "Email not confirmed":
        "Debes confirmar tu correo antes de iniciar sesión.",
    };
    return map[message] || message;
  }

  // ---------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    setLoading(loginSubmit, true, "Iniciar sesión");

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(loginSubmit, false, "Iniciar sesión");

    if (error) {
      showAlert(translateError(error.message));
      return;
    }

    window.location.href = "index.html";
  });

  // ---------------------------------------------------------------
  // Registro
  // ---------------------------------------------------------------
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert();

    const nombre = document.getElementById("register-nombre").value.trim();
    const apellido = document.getElementById("register-apellido").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    setLoading(registerSubmit, true, "Crear cuenta");

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, apellido },
      },
    });

    setLoading(registerSubmit, false, "Crear cuenta");

    if (error) {
      showAlert(translateError(error.message));
      return;
    }

    // Si el proyecto tiene "Confirm email" activado, Supabase no
    // entrega sesión inmediata: se le pide al usuario revisar su correo.
    if (!data.session) {
      showAlert(
        "Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.",
        "success"
      );
      registerForm.reset();
      return;
    }

    window.location.href = "index.html";
  });
})();
