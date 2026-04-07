import { performance } from 'perf_hooks';
import { renderizarHorarios } from './js/reservas/reservas-ui.js';

// Mock DOM
global.document = {
    getElementById: () => ({
        innerHTML: '',
        appendChild: () => {}
    }),
    createElement: () => ({
        dataset: {},
        style: {}
    }),
    createDocumentFragment: () => ({
        appendChild: () => {}
    })
};

const config = {
    ap: '08:00',
    ci: '20:00',
    br_i: '13:00',
    br_f: '14:00'
};

const duracion = 30;
const callback = () => {};

// Warmup
for(let i=0; i<1000; i++) {
    renderizarHorarios(duracion, config, callback);
}

// Measure
const iterations = 50000;
const start = performance.now();
for(let i=0; i<iterations; i++) {
    renderizarHorarios(duracion, config, callback);
}
const end = performance.now();

console.log(`Baseline Execution time for ${iterations} iterations: ${(end - start).toFixed(2)} ms`);
