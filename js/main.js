(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Footer yılı */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Scroll'da header kenarlığı */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Görünür olunca bölümleri yumuşakça getir */
  const revealTargets = document.querySelectorAll('.section__title, .section__lead, .card, .stat, .about__text, .faq__item, .form, .contact__aside');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('reveal', 'is-visible'));
  } else {
    revealTargets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
    });

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach((el) => revealObserver.observe(el));
  }

  /* Sayaç animasyonu */
  const counters = document.querySelectorAll('[data-count-to]');

  const setValue = (el, value) => {
    el.textContent = value + (el.dataset.suffix || '');
  };

  const animateCounter = (el) => {
    const target = Number(el.dataset.countTo) || 0;
    const duration = 1200;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(el, Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    counters.forEach((el) => setValue(el, Number(el.dataset.countTo) || 0));
  } else {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    counters.forEach((el) => counterObserver.observe(el));
  }

  /* ===== İletişim formu =====
     ACCESS_KEY boş bırakılırsa form mailto: yedeğine düşer.
     Web3Forms panelinden alınan anahtarı aşağıya yapıştırın. */
  const ACCESS_KEY = '';
  const FALLBACK_MAIL = 'farukkahya2882@gmail.com';

  const form = document.getElementById('contact-form');

  if (form) {
    const statusEl = document.getElementById('form-status');
    const submitBtn = form.querySelector('.form__submit');

    const fields = [
      {
        input: form.elements.name,
        error: document.getElementById('error-name'),
        validate: (v) => (v.length >= 2 ? '' : 'Lütfen adınızı yazın.')
      },
      {
        input: form.elements.email,
        error: document.getElementById('error-email'),
        validate: (v) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Geçerli bir e-posta adresi girin.'
      },
      {
        input: form.elements.message,
        error: document.getElementById('error-message'),
        validate: (v) => (v.length >= 10 ? '' : 'Mesajınız en az 10 karakter olmalı.')
      }
    ];

    const showError = (field, message) => {
      field.error.textContent = message;
      field.error.hidden = !message;
      field.input.setAttribute('aria-invalid', message ? 'true' : 'false');
    };

    const checkField = (field) => {
      const message = field.validate(field.input.value.trim());
      showError(field, message);
      return !message;
    };

    fields.forEach((field) => {
      field.input.addEventListener('blur', () => checkField(field));
      field.input.addEventListener('input', () => {
        if (field.error.hidden) return;
        checkField(field);
      });
    });

    const setStatus = (message, kind) => {
      statusEl.textContent = message;
      statusEl.hidden = !message;
      statusEl.classList.toggle('form__status--ok', kind === 'ok');
      statusEl.classList.toggle('form__status--error', kind === 'error');
    };

    /* Servis anahtarı yoksa: mesajı kullanıcının mail istemcisine aktar */
    const sendViaMailto = (data) => {
      const subject = `Web sitesi iletişim formu — ${data.name}`;
      const body = `Ad Soyad: ${data.name}\nE-posta: ${data.email}\n\n${data.message}`;
      window.location.href =
        `mailto:${FALLBACK_MAIL}?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`;
      setStatus('Mesajınız e-posta uygulamanızda açıldı. Göndermek için oradan onaylayın.', 'ok');
    };

    const sendViaService = async (data) => {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          subject: `Web sitesi iletişim formu — ${data.name}`,
          from_name: data.name,
          name: data.name,
          email: data.email,
          message: data.message
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Gönderim başarısız.');
      }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      /* Bot tuzağı dolduysa sessizce yut */
      if (form.elements.company.value) return;

      setStatus('', null);

      const results = fields.map(checkField);
      if (results.includes(false)) {
        const firstInvalid = fields[results.indexOf(false)].input;
        firstInvalid.focus();
        setStatus('Lütfen işaretli alanları düzeltin.', 'error');
        return;
      }

      const data = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        message: form.elements.message.value.trim()
      };

      if (!ACCESS_KEY) {
        sendViaMailto(data);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Gönderiliyor…';

      try {
        await sendViaService(data);
        form.reset();
        fields.forEach((field) => showError(field, ''));
        setStatus('Mesajınız iletildi. Genelde aynı gün içinde dönüş yapıyorum.', 'ok');
      } catch (error) {
        setStatus(
          'Mesaj gönderilemedi. Doğrudan ' + FALLBACK_MAIL + ' adresine yazabilirsiniz.',
          'error'
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Mesajı Gönder';
      }
    });
  }

  /* ===== Mobil menü ===== */
  const navToggle = document.getElementById('nav-toggle');
  const siteNav = document.getElementById('site-nav');

  if (navToggle && siteNav) {
    const desktopQuery = window.matchMedia('(min-width: 640px)');

    const setNav = (open) => {
      siteNav.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    };

    navToggle.addEventListener('click', () => {
      setNav(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    /* Bağlantıya tıklayınca kapat */
    siteNav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setNav(false);
    });

    /* Escape ile kapat, odak butona dönsün */
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (navToggle.getAttribute('aria-expanded') !== 'true') return;
      setNav(false);
      navToggle.focus();
    });

    /* Menü dışına tıklayınca kapat */
    document.addEventListener('click', (event) => {
      if (navToggle.getAttribute('aria-expanded') !== 'true') return;
      if (event.target.closest('.site-header__inner')) return;
      setNav(false);
    });

    /* Masaüstüne geçildiğinde durumu sıfırla */
    const onBreakpoint = (event) => {
      if (event.matches) setNav(false);
    };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', onBreakpoint);
    }
  }

  /* ===== Yukarı çık butonu ===== */
  const toTop = document.getElementById('to-top');

  if (toTop) {
    let visible = false;

    const updateToTop = () => {
      const shouldShow = window.scrollY > window.innerHeight * 0.6;
      if (shouldShow === visible) return;
      visible = shouldShow;

      if (shouldShow) {
        toTop.hidden = false;
        /* hidden kalkar kalkmaz geçişin çalışması için bir kare bekle */
        requestAnimationFrame(() => toTop.classList.add('is-visible'));
      } else {
        toTop.classList.remove('is-visible');
        if (prefersReducedMotion) {
          toTop.hidden = true;
        } else {
          setTimeout(() => {
            if (!visible) toTop.hidden = true;
          }, 300);
        }
      }
    };

    updateToTop();
    window.addEventListener('scroll', updateToTop, { passive: true });

    toTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    });
  }
})();
