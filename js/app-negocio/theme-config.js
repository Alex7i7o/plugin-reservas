/**
 * @fileoverview Módulo de configuración de tema para el panel de negocio Violett.
 * Permite personalizar colores y tipografías en tiempo real mediante CSS Custom Properties.
 * Los cambios se persisten en la base de datos de WordPress vía REST API.
 * @module app-negocio/theme-config
 */

import { apiFetch } from '../shared/api.js';

/** Valores por defecto del tema Violett */
const DEFAULTS = {
    primary: '#4b3669',
    primaryLight: '#624b85',
    primaryDark: '#3a2a52',
    accent: '#c8a35b',
    highlight: '#ff8c00',
    highlightHover: '#e67e00',
    fontPrimary: 'Raleway',
    fontSecondary: 'Segoe UI'
};

/** Mapeo de claves de configuración a CSS Custom Properties */
const CSS_VAR_MAP = {
    primary: '--v-primary',
    primaryLight: '--v-primary-light',
    primaryDark: '--v-primary-dark',
    accent: '--v-accent',
    highlight: '--v-highlight',
    highlightHover: '--v-highlight-hover',
    fontPrimary: '--v-font-primary',
    fontSecondary: '--v-font-secondary'
};

/** Mapeo de IDs de inputs del formulario a claves de configuración */
const INPUT_MAP = {
    'theme-primary': 'primary',
    'theme-primary-light': 'primaryLight',
    'theme-accent': 'accent',
    'theme-highlight': 'highlight',
    'theme-font-primary': 'fontPrimary',
    'theme-font-secondary': 'fontSecondary'
};

/** Fuentes de Google Fonts que requieren carga dinámica */
const GOOGLE_FONTS = ['Inter', 'Outfit', 'Poppins', 'Montserrat', 'Playfair Display', 'Roboto', 'Open Sans', 'Raleway'];

/**
 * Convierte un color hex (#RRGGBB) a una cadena "R, G, B" para usar con rgba().
 * @param {string} hex - Color en formato hexadecimal
 * @returns {string} Cadena "R, G, B"
 */
function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return `${parseInt(h.substring(0, 2), 16)}, ${parseInt(h.substring(2, 4), 16)}, ${parseInt(h.substring(4, 6), 16)}`;
}

/**
 * Oscurece un color hex un porcentaje dado.
 * @param {string} hex - Color hexadecimal
 * @param {number} percent - Porcentaje de oscurecimiento (0-100)
 * @returns {string} Color oscurecido en formato hex
 */
function darkenColor(hex, percent) {
    const h = hex.replace('#', '');
    const r = Math.max(0, Math.round(parseInt(h.substring(0, 2), 16) * (1 - percent / 100)));
    const g = Math.max(0, Math.round(parseInt(h.substring(2, 4), 16) * (1 - percent / 100)));
    const b = Math.max(0, Math.round(parseInt(h.substring(4, 6), 16) * (1 - percent / 100)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Aplica un objeto de configuración de tema directamente en las CSS Custom Properties del documento.
 * @param {Object} config - Configuración del tema con las claves definidas en CSS_VAR_MAP
 */
function applyThemeToDOM(config) {
    const root = document.documentElement;

    Object.entries(CSS_VAR_MAP).forEach(([key, cssVar]) => {
        if (config[key]) {
            const value = (key === 'fontPrimary' || key === 'fontSecondary')
                ? `'${config[key]}', sans-serif`
                : config[key];
            root.style.setProperty(cssVar, value);
        }
    });

    // Calcular valores derivados automáticamente
    if (config.primary) {
        root.style.setProperty('--v-primary-rgb', hexToRgb(config.primary));
        if (!config.primaryDark) {
            root.style.setProperty('--v-primary-dark', darkenColor(config.primary, 20));
        }
    }
    if (config.highlight) {
        root.style.setProperty('--v-highlight-rgb', hexToRgb(config.highlight));
        if (!config.highlightHover) {
            root.style.setProperty('--v-highlight-hover', darkenColor(config.highlight, 10));
        }
    }

    // Cargar Google Fonts si es necesario
    loadGoogleFonts(config);
}

/**
 * Carga dinámicamente las fuentes de Google Fonts necesarias.
 * @param {Object} config - Configuración del tema
 */
function loadGoogleFonts(config) {
    const fontsToLoad = [];
    if (config.fontPrimary && GOOGLE_FONTS.includes(config.fontPrimary)) {
        fontsToLoad.push(config.fontPrimary);
    }
    if (config.fontSecondary && GOOGLE_FONTS.includes(config.fontSecondary)) {
        fontsToLoad.push(config.fontSecondary);
    }

    if (fontsToLoad.length === 0) return;

    const existing = document.getElementById('violett-google-fonts');
    if (existing) existing.remove();

    const families = fontsToLoad.map(f => `family=${f.replace(/ /g, '+')}:wght@400;600;700`).join('&');
    const link = document.createElement('link');
    link.id = 'violett-google-fonts';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
}

/**
 * Lee los valores actuales del formulario de diseño.
 * @returns {Object} Configuración del tema basada en los inputs del formulario
 */
function readFormValues() {
    const config = {};
    Object.entries(INPUT_MAP).forEach(([inputId, configKey]) => {
        const el = document.getElementById(inputId);
        if (el) config[configKey] = el.value;
    });
    // Auto-derivar primaryDark y highlightHover
    if (config.primary) config.primaryDark = darkenColor(config.primary, 20);
    if (config.highlight) config.highlightHover = darkenColor(config.highlight, 10);
    return config;
}

/**
 * Carga los valores guardados en los inputs del formulario.
 * @param {Object} config - Configuración guardada
 */
function populateForm(config) {
    Object.entries(INPUT_MAP).forEach(([inputId, configKey]) => {
        const el = document.getElementById(inputId);
        if (el && config[configKey]) el.value = config[configKey];
    });
}

/**
 * Guarda la configuración de tema actual en la base de datos vía API.
 */
async function saveTheme() {
    const btn = document.getElementById('btn-save-theme');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const config = readFormValues();
        const resp = await apiFetch('config/theme', { method: 'POST', body: config });

        if (resp.ok) {
            btn.textContent = '¡Guardado!';
            setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2000);
        } else {
            const err = await resp.json();
            alert('Error al guardar: ' + (err.message || resp.statusText));
            btn.textContent = original;
            btn.disabled = false;
        }
    } catch (e) {
        console.error('Error saving theme:', e);
        alert('Error de red al guardar el tema.');
        btn.textContent = original;
        btn.disabled = false;
    }
}

/**
 * Restaura los valores por defecto del tema.
 */
function resetToDefaults() {
    if (!confirm('¿Restaurar los colores y fuentes originales de Violett?')) return;
    populateForm(DEFAULTS);
    applyThemeToDOM(DEFAULTS);
}

/**
 * Inicializa el módulo de configuración de tema.
 * Configura los event listeners y carga la configuración actual.
 */
export function initThemeConfig() {
    const container = document.getElementById('section-diseno');
    if (!container) return;

    console.log('Violett: Inicializando Configuración de Tema...');

    // Cargar config guardada
    const savedConfig = appConfig.themeConfig || {};
    const currentConfig = { ...DEFAULTS, ...savedConfig };
    populateForm(currentConfig);

    // Escuchar cambios en tiempo real (preview)
    Object.keys(INPUT_MAP).forEach(inputId => {
        const el = document.getElementById(inputId);
        if (el) {
            el.addEventListener('input', () => {
                applyThemeToDOM(readFormValues());
            });
        }
    });

    // Botón guardar
    const btnSave = document.getElementById('btn-save-theme');
    if (btnSave) btnSave.addEventListener('click', saveTheme);

    // Botón restaurar
    const btnReset = document.getElementById('btn-reset-theme');
    if (btnReset) btnReset.addEventListener('click', resetToDefaults);
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-negocio')) {
        initThemeConfig();
    }
});
