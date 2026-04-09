1. **Refactor SASS Components (`sass/_components.scss`)**:
   - Clean up code and use SASS variables from `sass/_variables.scss` (`$violeta`, `$blanco-roto`, `$dorado`, `$naranja`, etc.).
   - Improve specificity to avoid `!important` as much as possible.
   - Fix the critical bug where the `.selected` class on `.btn-horario` has its background overridden by gradient animations. Ensure `background-image: none;` and `animation: none;` are applied.

2. **Implement Tom Select for Services (`js/main.js` and `Template/app-interface.php`)**:
   - Replace native `#select-servicios` with a professional Tom Select implementation.
   - Ensure the new component uses styling that maps to the requested aesthetics: `$violeta` background, `$blanco-roto` text, `$dorado` hover.
   - Enqueue the tom-select CSS and JS correctly. Wait, this is a WordPress plugin, but we manage frontend via node_modules? No, we should probably use a CDN or local copy, but the user ran `npm install tom-select flatpickr`. Actually, wait, `npm install` just installed them in `node_modules`. But these are not being compiled via Webpack. The JS uses standard ES modules but browsers don't resolve bare specifiers like `import 'tom-select'`. It's better to use CDN links in `Template/app-interface.php` or `gestion-reservas.php`. I will update `gestion-reservas.php` to enqueue the scripts from a CDN.

3. **Implement Flatpickr for the Date Input (`js/main.js` and `Template/app-interface.php`)**:
   - Replace `<input type="date">` with a Flatpickr text input.
   - Configure Flatpickr with Raleway font, minimalist aesthetics.
   - Disable past dates (`minDate: "today"`).
   - Disable Sundays (since Lorena doesn't work). Flatpickr has a `disable` option that accepts a function checking the day of the week `(date.getDay() === 0)`.
   - Update `gestion-reservas.php` to enqueue the Flatpickr CSS and JS from a CDN.

4. **Verify interactions**:
   - Make sure selecting a service still reveals the calendar.
   - Make sure selecting a date still reveals the schedules.
   - Make sure submitting the schedule selection still works.
   - Compile CSS (`npx sass sass/main.scss css/main.css`).

5. **Pre-commit**: Complete pre-commit instructions.
