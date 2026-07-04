/* =========================================================
   FoodHub Pro — script.js
   Vanilla JS only. Sections:
   1. Page loader
   2. Theme (dark/light) toggle — persisted in localStorage
   3. Mobile hamburger menu
   4. Sticky navbar active-link highlight on scroll
   5. Scroll-reveal animation (IntersectionObserver)
   6. Back-to-top button
   7. Live food images (Foodish public API, with graceful fallback)
   8. Search + category filtering on Featured Foods
   9. Add-to-cart + toast notifications
   10. Newsletter form
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- 1. Page loader ---------- */
  const loader = document.getElementById('page-loader');
  window.addEventListener('load', () => {
    // Small delay so the loader animation is visible even on fast connections
    setTimeout(() => loader.classList.add('hidden'), 400);
  });

  /* ---------- 2. Theme toggle ---------- */
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('foodhub-theme');

  if (savedTheme) {
    document.body.setAttribute('data-theme', savedTheme);
    themeToggle.setAttribute('aria-pressed', savedTheme === 'light' ? 'true' : 'false');
  }

  themeToggle.addEventListener('click', () => {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    document.body.setAttribute('data-theme', next);
    themeToggle.setAttribute('aria-pressed', String(!isLight));
    localStorage.setItem('foodhub-theme', next);
  });

  /* ---------- 3. Mobile hamburger menu ---------- */
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  // Close mobile menu after a nav link is tapped
  navLinks.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- 4. Active nav link on scroll ---------- */
  const sections = document.querySelectorAll('main section[id]');
  const navLinkEls = document.querySelectorAll('.nav-link');

  const setActiveLink = () => {
    let currentId = 'top';
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 120 && rect.bottom > 120) currentId = section.id;
    });
    navLinkEls.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${currentId}`);
    });
  };
  window.addEventListener('scroll', setActiveLink, { passive: true });

  /* ---------- 5. Scroll-reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach((el) => revealObserver.observe(el));

  /* ---------- 6. Back-to-top button ---------- */
  const backToTop = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- 7. Live food images ---------- */
  // Foodish is a free, no-key, CORS-enabled public API that returns a
  // random real photo for a given food category. We use it so every
  // card shows an authentic photo without shipping large binary assets.
  // If the network call fails (e.g. offline), we fall back to a
  // gradient placeholder that already exists in the card's CSS.
  const FOODISH_BASE = 'https://foodish-api.com/api/images/';

  async function loadFoodImage(imgEl) {
    const category = imgEl.getAttribute('data-src-category');
    if (!category) return;
    try {
      const res = await fetch(FOODISH_BASE + category);
      if (!res.ok) throw new Error('Image request failed');
      const data = await res.json();
      imgEl.src = data.image;
      imgEl.addEventListener('load', () => imgEl.classList.add('loaded'), { once: true });
    } catch (err) {
      // Graceful fallback: keep the gradient background, hide the broken img
      imgEl.style.display = 'none';
      console.warn(`FoodHub Pro: could not load a live "${category}" photo.`, err);
    }
  }

  document.querySelectorAll('img[data-src-category]').forEach(loadFoodImage);

  // Hero image: reuse the pizza category for a strong opening shot
  const heroImage = document.getElementById('hero-image');
  if (heroImage) {
    fetch(FOODISH_BASE + 'biryani')
      .then((res) => res.json())
      .then((data) => { heroImage.src = data.image; })
      .catch(() => { heroImage.closest('.hero-image-frame').style.background = 'linear-gradient(145deg, var(--zest), var(--chili))'; });
  }

  /* ---------- 8. Search + category filtering ---------- */
  const foodCards = Array.from(document.querySelectorAll('.food-card'));
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const searchHint = document.getElementById('search-hint');
  const noResults = document.getElementById('no-results');
  const categoryButtons = document.querySelectorAll('.category-card');

  function filterFoods(term) {
    const query = term.trim().toLowerCase();
    let visibleCount = 0;

    foodCards.forEach((card) => {
      const name = (card.getAttribute('data-name') || '').toLowerCase();
      const category = (card.getAttribute('data-category') || '').toLowerCase();
      const matches = !query || name.includes(query) || category.includes(query);
      card.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    noResults.hidden = visibleCount !== 0;
    return visibleCount;
  }

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const term = searchInput.value;
    const count = filterFoods(term);
    document.getElementById('featured').scrollIntoView({ behavior: 'smooth' });
    searchHint.textContent = term
      ? `Showing ${count} dish${count === 1 ? '' : 'es'} matching “${term}”.`
      : '';
    categoryButtons.forEach((btn) => btn.classList.remove('active-filter'));
  });

  categoryButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      categoryButtons.forEach((b) => b.classList.remove('active-filter'));
      btn.classList.add('active-filter');
      searchInput.value = '';
      const count = filterFoods(filter);
      searchHint.textContent = `Showing ${count} dish${count === 1 ? '' : 'es'} in “${btn.querySelector('.category-name').textContent}”.`;
      document.getElementById('featured').scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- 9. Add-to-cart + toast ---------- */
  const cartCountEl = document.getElementById('cart-count');
  const toast = document.getElementById('toast');
  let cartCount = 0;
  let toastTimer = null;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
  }

  document.querySelectorAll('.add-to-cart').forEach((btn) => {
    btn.addEventListener('click', () => {
      cartCount += 1;
      cartCountEl.textContent = String(cartCount);
      const card = btn.closest('.food-card');
      const name = card ? card.getAttribute('data-name') : 'Item';
      showToast(`Added “${name}” to your cart.`);

      // Small tactile confirmation on the button itself
      btn.textContent = 'Added ✓';
      setTimeout(() => { btn.textContent = 'Add to Cart'; }, 1200);
    });
  });

  /* ---------- 10. Newsletter form ---------- */
  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterMsg = document.getElementById('newsletter-msg');

  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('newsletter-email');
    const email = emailInput.value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValid) {
      newsletterMsg.style.color = 'var(--chili)';
      newsletterMsg.textContent = 'Please enter a valid email address.';
      return;
    }

    newsletterMsg.style.color = 'var(--herb)';
    newsletterMsg.textContent = `You're on the list! We'll send offers to ${email}.`;
    emailInput.value = '';
  });

  /* ---------- Footer year ---------- */
  document.getElementById('year').textContent = String(new Date().getFullYear());

});
