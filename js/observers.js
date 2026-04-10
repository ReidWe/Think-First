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
// threshold: 0 fires as soon as any pixel enters the viewport
// rootMargin -50px on bottom triggers slightly before full entry
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');

      // Also trigger any bar-fills nested inside this reveal container
      entry.target.querySelectorAll('.bar-fill').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') + '%';
      });

      revealObserver.unobserve(entry.target);
    }
  });
}, {
  rootMargin: '0px 0px -50px 0px',
  threshold: 0
});

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ---- Bar fill animation (for bars NOT inside a .reveal) ----
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.width = entry.target.getAttribute('data-width') + '%';
      barObserver.unobserve(entry.target);
    }
  });
}, {
  rootMargin: '0px 0px -50px 0px',
  threshold: 0
});

document.querySelectorAll('.bar-fill').forEach(bar => {
  if (!bar.closest('.reveal')) {
    barObserver.observe(bar);
  }
});
