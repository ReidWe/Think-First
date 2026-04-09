/* ============================================
   observers.js - IntersectionObserver-based
   nav highlighting, scroll reveals, bar fills
   ============================================ */

const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

// ---- Active nav highlighting ----
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${id}`) {
          link.classList.add('active');
        }
      });
    }
  });
}, {
  rootMargin: '-20% 0px -70% 0px',
  threshold: 0
});

sections.forEach(section => navObserver.observe(section));

// ---- Scroll reveal (fire once) ----
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15
});

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ---- Bar fill animation (fire once) ----
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.width = entry.target.getAttribute('data-width') + '%';
      barObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1
});

document.querySelectorAll('.bar-fill').forEach(bar => barObserver.observe(bar));
