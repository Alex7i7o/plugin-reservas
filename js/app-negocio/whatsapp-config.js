// js/app-negocio/whatsapp-config.js

document.addEventListener('DOMContentLoaded', () => {
    const formConfig = document.getElementById('form-whatsapp-config');
    if (!formConfig) return;

    // Elementos del DOM
    const inputGeminiKey = document.getElementById('wpp-gemini-key');
    const inputApiToken = document.getElementById('wpp-api-token');
    const inputPhoneId = document.getElementById('wpp-phone-id');
    const inputRecordatorios = document.getElementById('wpp-recordatorios-activos');
    const inputPersonalidad = document.getElementById('wpp-prompt-personalidad');
    const inputRecuperacion = document.getElementById('wpp-prompt-recuperacion');
    const statusDiv = document.getElementById('wpp-config-status');
    const btnSave = document.getElementById('btn-save-wpp-config');

    // Cargar datos actuales desde appConfig
    if (typeof appConfig !== 'undefined' && appConfig.whatsappConfig) {
        const config = appConfig.whatsappConfig;
        
        // No mostramos las keys por seguridad si ya existen, pero podemos poner un placeholder distinto si hay algo
        if (config.gemini_api_key) inputGeminiKey.placeholder = "******** (Ya configurada)";
        if (config.whatsapp_api_token) inputApiToken.placeholder = "******** (Ya configurada)";
        
        inputPhoneId.value = config.whatsapp_phone_id || '';
        inputRecordatorios.checked = Boolean(config.recordatorios_activos);
        inputPersonalidad.value = config.prompt_personalidad || '';
        inputRecuperacion.value = config.prompt_recuperacion || '';
    }

    formConfig.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Armar el payload
        const payload = {
            whatsapp_phone_id: inputPhoneId.value.trim(),
            recordatorios_activos: inputRecordatorios.checked,
            prompt_personalidad: inputPersonalidad.value.trim(),
            prompt_recuperacion: inputRecuperacion.value.trim()
        };

        // Solo enviar keys si el usuario escribió algo nuevo
        if (inputGeminiKey.value.trim() !== '') {
            payload.gemini_api_key = inputGeminiKey.value.trim();
        }
        if (inputApiToken.value.trim() !== '') {
            payload.whatsapp_api_token = inputApiToken.value.trim();
        }

        // Mostrar estado cargando
        btnSave.disabled = true;
        btnSave.textContent = 'Guardando y probando...';
        statusDiv.style.display = 'block';
        statusDiv.style.backgroundColor = '#f0f0f0';
        statusDiv.style.color = '#333';
        statusDiv.textContent = 'Enviando configuración...';

        try {
            const response = await fetch(`${appConfig.violettApiUrl}config/whatsapp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': appConfig.nonce
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                statusDiv.style.backgroundColor = '#d4edda';
                statusDiv.style.color = '#155724';
                
                let htmlStatus = `<strong>¡Guardado con éxito!</strong><br>${data.message}`;
                if (data.gemini_status) {
                    htmlStatus += `<br><br><strong>Estado Conexión Gemini:</strong> ${data.gemini_status}`;
                }
                
                statusDiv.innerHTML = htmlStatus;

                // Limpiar los campos de password
                inputGeminiKey.value = '';
                inputApiToken.value = '';
                if (payload.gemini_api_key) inputGeminiKey.placeholder = "******** (Ya configurada)";
                if (payload.whatsapp_api_token) inputApiToken.placeholder = "******** (Ya configurada)";

            } else {
                throw new Error(data.message || 'Error al guardar la configuración');
            }
        } catch (error) {
            console.error('Error:', error);
            statusDiv.style.backgroundColor = '#f8d7da';
            statusDiv.style.color = '#721c24';
            statusDiv.textContent = error.message;
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = 'Guardar y Probar Conexión';
        }
    });
});
