/* ═══════════════════════════════════════════════
   ATELIER REVIVA — JavaScript principal
   Interactions légères et premium
═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─────────────────────────────────────────────
     1. HEADER — Effet au scroll
  ───────────────────────────────────────────── */
  const header = document.getElementById('header');

  if (header) {
    const onScroll = () => {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // état initial
  }

  /* ─────────────────────────────────────────────
     2. MENU MOBILE — Toggle hamburger
  ───────────────────────────────────────────── */
  const menuToggle = document.getElementById('menuToggle');
  const mainNav    = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      menuToggle.classList.toggle('open', isOpen);
      menuToggle.setAttribute('aria-expanded', isOpen.toString());
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Fermer le menu au clic sur un lien
    mainNav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Fermer si clic dehors
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target)) {
        mainNav.classList.remove('open');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ─────────────────────────────────────────────
     3. ANIMATIONS — Entrée au scroll (fade-in)
  ───────────────────────────────────────────── */
  const fadeTargets = document.querySelectorAll(
    '.pillar-item, .portfolio-card, .service-item, ' +
    '.product-card, .testi-card, .intro, ' +
    '.formation-text-col, .about-text-col, .cta-content'
  );

  if ('IntersectionObserver' in window && fadeTargets.length > 0) {
    fadeTargets.forEach(el => el.classList.add('fade-in'));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Décalage cascade léger
          const delay = (i % 4) * 80;
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    fadeTargets.forEach(el => observer.observe(el));
  }

  /* ─────────────────────────────────────────────
     4. NAVIGATION — Lien actif
  ───────────────────────────────────────────── */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  /* ─────────────────────────────────────────────
     5. AVANT/APRÈS — Effet hover
  ───────────────────────────────────────────── */
  // Le CSS gère l'essentiel — JS pour améliorer l'accessibilité
  document.querySelectorAll('.portfolio-card').forEach(card => {
    card.setAttribute('role', 'article');
  });

});
