import { renderizarHorarios } from './reservas-ui.js';

describe('reservas-ui.js - renderizarHorarios', () => {
    let mockCallback;

    beforeEach(() => {
        // Clear DOM
        document.body.innerHTML = '';
        // Setup mock callback
        mockCallback = jest.fn();
    });

    it('should return early and not throw if #grid-horarios container does not exist', () => {
        const config = { ap: '08:00', ci: '18:00', br_i: '12:00', br_f: '13:00' };

        expect(() => {
            renderizarHorarios(30, config, mockCallback);
        }).not.toThrow();

        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should render schedule buttons correctly for a basic path without crossing the break', () => {
        // Add container to DOM
        document.body.innerHTML = '<div id="grid-horarios"></div>';
        const contenedor = document.getElementById('grid-horarios');

        const config = { ap: '08:00', ci: '10:00', br_i: '12:00', br_f: '13:00' };
        renderizarHorarios(60, config, mockCallback);

        const buttons = contenedor.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        expect(buttons[0].textContent).toBe('08:00');
        expect(buttons[1].textContent).toBe('09:00');
    });

    it('should skip the break period when rendering buttons', () => {
        document.body.innerHTML = '<div id="grid-horarios"></div>';
        const contenedor = document.getElementById('grid-horarios');

        const config = { ap: '10:00', ci: '14:00', br_i: '11:00', br_f: '13:00' };
        renderizarHorarios(60, config, mockCallback);

        const buttons = contenedor.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        expect(buttons[0].textContent).toBe('10:00');
        expect(buttons[1].textContent).toBe('13:00');
    });

    it('should handle boundaries properly (exact matching)', () => {
        document.body.innerHTML = '<div id="grid-horarios"></div>';
        const contenedor = document.getElementById('grid-horarios');

        const config = { ap: '08:00', ci: '09:00', br_i: '12:00', br_f: '13:00' };
        // Duration 30 mins: 08:00, 08:30 (next is 09:00 + 30 > 09:00 -> excluded)
        renderizarHorarios(30, config, mockCallback);

        const buttons = contenedor.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        expect(buttons[0].textContent).toBe('08:00');
        expect(buttons[1].textContent).toBe('08:30');
    });

    it('should call the callback function when a button is clicked', () => {
        document.body.innerHTML = '<div id="grid-horarios"></div>';
        const contenedor = document.getElementById('grid-horarios');

        const config = { ap: '08:00', ci: '09:00', br_i: '12:00', br_f: '13:00' };
        renderizarHorarios(60, config, mockCallback);

        const button = contenedor.querySelector('button');
        expect(button.textContent).toBe('08:00');

        // Simulate click
        button.click();

        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledWith('08:00', expect.any(Object));
    });
});
