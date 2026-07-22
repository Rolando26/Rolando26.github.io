/* ============================================================
   Rolando — Portfolio interactions
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Theme (light / dark) ---------- */
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  var stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) {}

  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', stored || (prefersDark ? 'dark' : 'light'));

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---------- Header: scrolled state + hide on scroll-down ---------- */
  var header = document.querySelector('.site-header');
  var lastY = window.pageYOffset;
  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset;
    if (header) {
      header.classList.toggle('scrolled', y > 20);
      // Hide when scrolling down past the hero, show when scrolling up.
      if (y > lastY && y > 420) header.classList.add('hide');
      else header.classList.remove('hide');
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById('menuBtn');
  var mobileMenu = document.getElementById('mobileMenu');

  function closeMenu() {
    if (!menuBtn || !mobileMenu) return;
    menuBtn.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function () {
      var open = menuBtn.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      mobileMenu.classList.toggle('open', open);
      mobileMenu.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // small stagger for siblings
          var el = entry.target;
          var delay = el.dataset.delay ? parseInt(el.dataset.delay, 10) : 0;
          setTimeout(function () { el.classList.add('in'); }, delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(function (el, i) {
      // stagger elements that share a parent
      var siblings = el.parentElement ? el.parentElement.querySelectorAll(':scope > .reveal') : [];
      if (siblings.length > 1) {
        var idx = Array.prototype.indexOf.call(siblings, el);
        el.dataset.delay = String(Math.min(idx, 6) * 70);
      }
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Active nav link ---------- */
  var sections = document.querySelectorAll('main section[id]');
  var navLinks = document.querySelectorAll('.nav a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute('id');
          navLinks.forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Live clock (Tangerang / WIB) ---------- */
  var clock = document.getElementById('clock');
  if (clock) {
    var fmt = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'Asia/Jakarta'
    });
    var tick = function () { clock.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Current year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Copy email to clipboard ---------- */
  var emailBtn = document.getElementById('emailBtn');
  var copyHint = document.getElementById('copyHint');
  if (emailBtn && copyHint && navigator.clipboard) {
    emailBtn.addEventListener('click', function (e) {
      // Let the mailto fire, but also copy for convenience.
      navigator.clipboard.writeText('andorolandowork@gmail.com').then(function () {
        var prev = copyHint.textContent;
        copyHint.textContent = 'Copied ✓';
        setTimeout(function () { copyHint.textContent = prev; }, 1600);
      }).catch(function () {});
    });
  }

  /* ---------- CV download button ---------- */
  // Point to your PDF. Drop the file at assets/CV-Rolando.pdf (see README).
  var cvBtn = document.getElementById('cvBtn');
  if (cvBtn) cvBtn.setAttribute('href', 'assets/CV-Rolando.pdf');

})();
