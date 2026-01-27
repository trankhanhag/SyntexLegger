import { describe, it, expect } from 'vitest';

describe('Smoke Test', () => {
    it('should pass', () => {
        expect(1 + 1).toBe(2);
    });

    it('should have access to DOM', () => {
        const element = document.createElement('div');
        element.innerHTML = 'Hello World';
        expect(element.innerHTML).toBe('Hello World');
    });
});
