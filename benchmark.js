import { obtenerServiciosDesdeWP } from './js/reservas/servicios-service.js';

global.appConfig = { apiUrl: 'http://localhost/' };
global.sessionStorage = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, value) { this.store[key] = value; }
};

global.fetch = async (url) => {
    // simulate network delay
    await new Promise(r => setTimeout(r, 100));
    return {
        ok: true,
        json: async () => [{ id: 1, name: 'Service 1' }]
    };
};

async function runBenchmark() {
    const start = Date.now();
    for (let i = 0; i < 10; i++) {
        await obtenerServiciosDesdeWP();
    }
    const end = Date.now();
    console.log(`Time taken for 10 requests: ${end - start} ms`);
}

runBenchmark();
