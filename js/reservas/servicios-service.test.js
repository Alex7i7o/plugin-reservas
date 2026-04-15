import { jest } from '@jest/globals';
import { obtenerServiciosDesdeWP } from './servicios-service.js';

describe('servicios-service', () => {
    beforeEach(() => {
        global.appConfig = { apiUrl: 'http://example.com/api/' };
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('throws error when fetch response is not ok', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
        });

        // Supress console.error
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(obtenerServiciosDesdeWP()).rejects.toThrow("Error al traer servicios");

        expect(global.fetch).toHaveBeenCalledWith('http://example.com/api/servicio');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('returns services when fetch response is ok', async () => {
        const mockServicios = [{ id: 1, nombre: 'Servicio 1' }];
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue(mockServicios),
        });

        const result = await obtenerServiciosDesdeWP();

        expect(global.fetch).toHaveBeenCalledWith('http://example.com/api/servicio');
        expect(result).toEqual(mockServicios);
    });
});
