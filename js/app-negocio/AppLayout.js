export function initAppLayout() {
    const navButtons = document.querySelectorAll('.app-nav-btn');

    if (navButtons.length === 0) return;

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = btn.getAttribute('data-target');
            if (sectionId) {
                showSection(sectionId);
            }
        });
    });
}

export function showSection(sectionId) {
    // 1. Busque todos los elementos con la clase .app-section
    const sections = document.querySelectorAll('.app-section');

    // 2. Les agregue display: none (o una clase hidden)
    sections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });

    // 3. Remueva la clase active del menú previo y la asigne al botón clicado.
    const navButtons = document.querySelectorAll('.app-nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-target') === sectionId) {
            btn.classList.add('active');
        }
    });

    // 4. Muestre únicamente el div con el ID section-sectionId
    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
    }
}
