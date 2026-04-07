export async function guardarReservaEnWP(datos) {
    const response = await fetch(`${appConfig.apiUrl}reserva`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': appConfig.nonce
        },
        body: JSON.stringify(datos)
    });
    return response.ok;
}