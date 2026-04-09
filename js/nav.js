/* ============================================
   nav.js - Hamburger toggle & mobile menu
   ============================================ */

const hamburger = document.getElementById('hamburger');
const navLinksEl = document.getElementById('navLinks');
const navLinks = document.querySelectorAll('.nav-links a');

// Toggle mobile menu
hamburger.addEventListener('click', () => {
  const isOpen = navLinksEl.classList.toggle('mobile-open');
  hamburger.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', isOpen);
});

// Close mobile menu when a link is tapped
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (navLinksEl.classList.contains('mobile-open')) {
      navLinksEl.classList.remove('mobile-open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
});
