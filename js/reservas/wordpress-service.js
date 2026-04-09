export async function guardarReservaEnWP(datos) {
    const response = await fetch(`${appConfig.apiUrl}reserva`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': appConfig.nonce
        },
        body: JSON.stringify(datos)
    });

    if (response.ok) {
        const data = await response.json();
        return { ok: true, init_point: data.init_point, method: data.method };
    }

    return { ok: false };
}