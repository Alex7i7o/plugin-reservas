import { calcularFin } from './utils.js';

describe('calcularFin', () => {
    test('Happy Path: should add minutes to a time correctly', () => {
        expect(calcularFin('10:00', 30)).toBe('10:30');
    });

    test('Hour Wrap: should handle additions that cross hour boundaries', () => {
        expect(calcularFin('10:45', 30)).toBe('11:15');
    });

    test('Multi-hour addition: should handle durations longer than 60 minutes', () => {
        expect(calcularFin('09:00', 120)).toBe('11:00');
    });

    test('Midnight Wrap: should handle crossing midnight (current behavior)', () => {
        expect(calcularFin('23:30', 60)).toBe('24:30');
    });

    test('Zero Duration: should return the same time if duration is 0', () => {
        expect(calcularFin('10:00', 0)).toBe('10:00');
    });

    test('String duration: should handle duration as a string', () => {
        expect(calcularFin('10:00', '30')).toBe('10:30');
    });
});
