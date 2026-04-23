/**
 * Main JavaScript module for S3 Static Web App.
 * Handles smooth scroll navigation and mobile menu interactivity.
 * The page remains functional if this script fails to load (progressive enhancement).
 */
document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initMobileMenu();
});

/**
 * Initializes the mobile menu toggle.
 * Collapses the nav menu on page load by adding the `nav-closed` class,
 * then toggles visibility when the `.nav-toggle` button is clicked.
 * Updates `aria-expanded` on the toggle button to reflect menu state.
 *
 * Graceful degradation: if this script fails to load, the menu stays
 * visible by default (no `nav-closed` class), so content remains accessible.
 */
function initMobileMenu() {
    var toggleButton = document.querySelector('.nav-toggle');
    var navMenu = document.getElementById('nav-menu');

    if (!toggleButton || !navMenu) {
        return;
    }

    // Collapse the menu on page load so it starts closed on mobile
    navMenu.classList.add('nav-closed');
    toggleButton.setAttribute('aria-expanded', 'false');

    toggleButton.addEventListener('click', function () {
        var isOpen = !navMenu.classList.contains('nav-closed');

        if (isOpen) {
            // Close the menu
            navMenu.classList.add('nav-closed');
            toggleButton.setAttribute('aria-expanded', 'false');
        } else {
            // Open the menu
            navMenu.classList.remove('nav-closed');
            toggleButton.setAttribute('aria-expanded', 'true');
        }
    });
}

/**
 * Initializes smooth scroll navigation for all anchor links in the nav.
 * Attaches click listeners that scroll to the target section smoothly
 * instead of the default instant jump.
 */
function initNavigation() {
    var navLinks = document.querySelectorAll('#nav-menu a[href^="#"]');

    navLinks.forEach(function (link) {
        link.addEventListener('click', function (event) {
            var targetId = link.getAttribute('href').substring(1);
            var targetSection = document.getElementById(targetId);

            if (targetSection) {
                event.preventDefault();
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}
