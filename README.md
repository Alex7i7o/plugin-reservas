# 🧘‍♂️ Sistema de Gestión de Reservas

Este es un plugin personalizado para WordPress diseñado para gestionar las reservas de un negocio (estetica - pilates). El sistema utiliza una arquitectura desacoplada con un backend en WordPress y un frontend dinámico basado en módulos de JavaScript.

## 🚀 Características Principales

* **Flujo de Reserva Modular:** Interfaz de usuario dividida en pasos (Login -> Servicio -> Calendario -> Confirmación).
* **Integración con Google Calendar:** Sincronización automática de turnos mediante OAuth2 y Google Calendar API.
* **Gestión de Servicios:** Carga dinámica de servicios (precios y duraciones) desde Custom Post Types (CPT).

## 🚀 Arquitectura del Proyecto

El proyecto está organizado para separar la lógica de negocio, la interfaz de usuario y la comunicación con APIs externas.

## 🛠️ Stack Tecnológico

* **Backend:** WordPress (PHP).
* **Base de Datos:** Custom Post Types + Advanced Custom Fields (ACF).
* **Frontend:** JavaScript Vanilla (ES6 Modules).
* **API:** WordPress REST API + Google Calendar API.
* **Estilos:** SASS (SCSS) compilado a `css/style.css`.
* **Agente de IA:** Optimizado para trabajar con **Jules (Google)** mediante contexto de repositorio.

### 📁 Estructura de Archivos
Basado en la organización del plugin:

* **`js/reservas/`**: Lógica central del flujo de reserva.
    * `reservas-ui.js`: Manejo del DOM y transiciones de pasos.
    * `servicios-service.js`: Comunicación con WP REST API para obtener CPT Servicios.
    * `wordpress-service.js`: Gestión de persistencia de datos en WordPress.
* **`js/shared/`**: Módulos transversales reutilizables.
    * `auth.js`: Autenticación con Google OAuth2.
    * `calendario-service.js`: Integración con Google Calendar API.
    * `utils.js`: Funciones de formateo y lógica de fechas.
* **`js/main.js`**: Orquestador principal del frontend.
* **`sass/`**: Estilos preprocesados.
    * `_variables.scss`: Colores de marca, fuentes y espaciados.
    * `_components.scss`: Estilos de botones, inputs y calendarios.
    * `_layout.scss`: Grillas y contenedores de las secciones.
    * `main.scss`: Archivo raíz de compilación.
* **`Template/`**: Archivos de interfaz PHP para WordPress.


---
Desarrollado por **Alex Agüero** - Argentina, 2026.