/**
 * @fileoverview Módulo centralizado de API para el plugin Violett.
 * Provee helpers reutilizables para comunicarse con el backend de WordPress.
 * @module shared/api
 */

/**
 * Retorna la URL base de la API REST de Violett.
 * @returns {string} URL base (ej: "https://sitio.com/wp-json/violett/v1/")
 */
export function getApiUrl() {
    return appConfig.violettApiUrl || appConfig.apiUrl.replace('wp/v2/', 'violett/v1/');
}

/**
 * Wrapper de fetch con headers comunes ya configurados.
 * @param {string} endpoint - Ruta relativa (ej: "servicios/todos")
 * @param {Object} [options={}] - Opciones adicionales para fetch
 * @param {string} [options.method='GET'] - Método HTTP
 * @param {Object} [options.body] - Cuerpo de la petición (se serializa a JSON)
 * @returns {Promise<Response>} Respuesta del servidor
 */
export async function apiFetch(endpoint, options = {}) {
    const url = `${getApiUrl()}${endpoint}`;
    const headers = {
        'X-WP-Nonce': appConfig.nonce,
        ...(options.body ? { 'Content-Type': 'application/json' } : {})
    };

    return fetch(url, {
        method: options.method || 'GET',
        headers,
        credentials: 'same-origin',
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
}

/**
 * Escapa HTML para prevenir XSS al insertar texto en el DOM.
 * @param {string} str - Texto a escapar
 * @returns {string} Texto escapado
 */
export function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
