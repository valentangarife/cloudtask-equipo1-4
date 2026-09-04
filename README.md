# cloudtask-equipo1-4

Aplicación web para la gestión de tareas personales o de un equipo de trabajo, desarrollada como parte
del laboratorio desafío del Seminario de Ingeniería de Software (Universidad Icesi)

## Descripción

CloudTasks permite:

- Crear una tarea.
- Visualizar las tareas registradas.
- Marcar una tarea como completada.
- Eliminar una tarea.
- Mostrar el estado de cada tarea (pendiente / completada).
- Validar los datos introducidos por el usuario.

Cada tarea contiene: `id`, `title`, `description`, `completed`, `created_at`, `deadline`, `priority`.

## Etapa actual: Etapa 1 — Desarrollo local

En esta etapa la aplicación se ejecuta completamente en el navegador. Las tareas se almacenan
temporalmente en `localStorage`, de modo que persisten entre recargas de página mientras se desarrolla
localmente. En la Etapa 2 este almacenamiento será reemplazado por Supabase (PostgreSQL) sin modificar
la interfaz de usuario

## Tecnologías

- HTML5
- CSS3 + [Bootstrap 5](https://getbootstrap.com/) (solo para estilos/componentes visuales)
- JavaScript (vanilla, sin frameworks)

## Próximas etapas

- **Etapa 2:** Persistencia con Supabase (PostgreSQL) y despliegue en Vercel
- **Etapa 3:** Configuración de dominio, DNS y HTTPS mediante Cloudflare