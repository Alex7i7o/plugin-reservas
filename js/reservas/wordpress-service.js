export async function guardarReservaEnWP(datos) {
    const tokenParam = appConfig.violettToken ? `?violett_token=${appConfig.violettToken}` : '';
    const response = await fetch(`${appConfig.apiUrl}reserva${tokenParam}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': appConfig.nonce,
            'X-Violett-Token': appConfig.violettToken || ''
        },
        body: JSON.stringify(datos)
    });

    if (response.ok) {
        const data = await response.json();
        return { ok: true, init_point: data.init_point, method: data.method };
    }

    return { ok: false };
}