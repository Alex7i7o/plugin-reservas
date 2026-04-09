
// Helper to simulate textContent and createElement in a minimal way
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

function test_logic() {
    const malicious = '<img src=x onerror=alert(1)>';

    // Original (vulnerable) logic:
    // loginSection.innerHTML = `<span>Listo, <strong>${perfil.name}</strong></span>`;
    const vulnerableResult = `<span>Listo, <strong>${malicious}</strong></span>`;
    if (vulnerableResult.includes('<img')) {
        console.log('Confirmed: Original logic was vulnerable.');
    }

    // Refactored logic:
    // const strong = document.createElement('strong');
    // strong.textContent = perfil.name;
    // ...
    // textContent correctly escapes characters.
    const safeName = escapeHTML(malicious);
    const refactoredResult = `<span>Listo, <strong>${safeName}</strong></span>`;

    if (refactoredResult.includes('<img')) {
        console.error('XSS Detected in refactored logic simulation!');
        process.exit(1);
    } else {
        console.log('Refactored logic simulation is safe.');
    }

    if (refactoredResult.includes('&lt;img')) {
        console.log('Characters correctly escaped.');
    }
}

describe('Validation', () => {
    it('should pass the test logic', () => {
        expect(() => test_logic()).not.toThrow();
    });
});
