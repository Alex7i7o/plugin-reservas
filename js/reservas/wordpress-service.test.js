import { guardarReservaEnWP } from './wordpress-service.js';

describe('wordpress-service', () => {
    beforeEach(() => {
        global.appConfig = {
            apiUrl: 'https://example.com/wp-json/api/v1/',
            nonce: 'test_nonce_123'
        };
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete global.appConfig;
    });

    describe('guardarReservaEnWP', () => {
        it('should call fetch with the correct URL', async () => {
            global.fetch.mockResolvedValueOnce({ ok: true });
            const mockDatos = { id: 1 };

            await guardarReservaEnWP(mockDatos);

            expect(global.fetch).toHaveBeenCalledWith(
                'https://example.com/wp-json/api/v1/reserva',
                expect.any(Object)
            );
        });

        it('should call fetch with the correct method, headers, and body', async () => {
            global.fetch.mockResolvedValueOnce({ ok: true });
            const mockDatos = { test: 'data' };

            await guardarReservaEnWP(mockDatos);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': 'test_nonce_123'
                    },
                    body: JSON.stringify(mockDatos)
                })
            );
        });

        it('should return true when response.ok is true', async () => {
            global.fetch.mockResolvedValueOnce({ ok: true });
            const result = await guardarReservaEnWP({});
            expect(result).toBe(true);
        });

        it('should return false when response.ok is false', async () => {
            global.fetch.mockResolvedValueOnce({ ok: false });
            const result = await guardarReservaEnWP({});
            expect(result).toBe(false);
        });
    });
});
