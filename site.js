// RESET · formularios (Web3Forms) y pequeños detalles de interfaz
(() => {
  const WEB3FORMS_KEY = '1c515b36-ff91-4d74-bf1a-f64a699a5f9b'; // clave pública del formulario "RESET"
  const ENDPOINT = 'https://api.web3forms.com/submit';
  const CONTACT = 'resett.info@gmail.com';

  const MSG = {
    email: 'Escribe un email válido, por ejemplo tu@email.com.',
    required: 'Rellena este campo.',
    consent: 'Marca la casilla para poder apuntarte.'
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Enlaces antiguos a /#marcas llevan a la página de marcas
  if (location.hash === '#marcas' && document.body.dataset.page === 'clientas') {
    location.replace('marcas.html');
  }

  function setError(input, text) {
    const field = input.closest('.field, .consent');
    if (!field) return;
    let err = field.querySelector('.err');
    if (!err) {
      err = document.createElement('p');
      err.className = 'err';
      err.id = (input.id || input.name) + '-err';
      field.appendChild(err);
    }
    err.textContent = text;
    field.classList.add('has-error');
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', err.id);
  }
  function clearError(input) {
    const field = input.closest('.field, .consent');
    if (!field) return;
    field.classList.remove('has-error');
    input.removeAttribute('aria-invalid');
  }

  function validate(form) {
    let first = null;
    form.querySelectorAll('[required]').forEach(el => {
      clearError(el);
      if (el.checkValidity()) return;
      const text = el.type === 'checkbox' ? MSG.consent : (el.type === 'email' && el.value ? MSG.email : MSG.required);
      setError(el, text);
      if (!first) first = el;
    });
    if (first) first.focus();
    return !first;
  }

  function collect(form) {
    const data = {};
    for (const [k, v] of new FormData(form).entries()) {
      if (k === 'botcheck') continue;
      if (typeof v === 'string' && !v.trim()) continue;
      data[k] = data[k] ? data[k] + ', ' + v : v;
    }
    return data;
  }

  function mailto(subject, data) {
    const body = Object.entries(data).map(([k, v]) => k.replace(/_/g, ' ') + ': ' + v).join('\n');
    return 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  async function send(subject, data) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject, from_name: 'Web RESET', ...data, ...(data.email ? { replyto: data.email } : {}) })
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.success === false) throw new Error(out.message || 'Error');
    } finally {
      clearTimeout(timer);
    }
  }

  function show(step) {
    const wrap = step.closest('[data-steps]');
    wrap.querySelectorAll('.step').forEach(s => { s.hidden = s !== step; s.classList.remove('is-in'); });
    if (!reduce) step.classList.add('is-in');
    const focusTarget = step.querySelector('[data-focus]') || step.querySelector('h2, h3, .done-title');
    if (focusTarget) { focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus({ preventScroll: true }); }
  }

  document.querySelectorAll('form[data-subject]').forEach(form => {
    form.addEventListener('input', e => { if (e.target.matches('[aria-invalid]')) clearError(e.target); });
    form.addEventListener('change', e => { if (e.target.matches('[aria-invalid]')) clearError(e.target); });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const status = form.querySelector('.status');
      const btn = form.querySelector('button[type=submit]');
      if (form.botcheck && form.botcheck.checked) return;
      if (!validate(form)) { status.textContent = ''; return; }

      const data = collect(form);
      // El segundo paso hereda el email/marca del primero para que se puedan juntar en el correo
      const wrap = form.closest('[data-steps]');
      if (wrap && form.dataset.carry) {
        const prev = wrap.querySelector('form[data-subject]:not([data-carry])');
        if (prev && prev._sent) Object.assign(data, prev._sent);
      }

      const label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Enviando…';
      status.textContent = '';
      try {
        await send(form.dataset.subject, data);
        form._sent = form.dataset.carry ? null : pick(data, ['email', 'marca']);
        form.reset();
        const next = form.dataset.next && document.querySelector(form.dataset.next);
        if (next) show(next);
        else status.textContent = form.dataset.ok || '¡Recibido!';
      } catch (err) {
        status.textContent = 'No se ha podido enviar desde la web. ';
        const a = document.createElement('a');
        a.href = mailto(form.dataset.subject, data);
        a.textContent = 'Envíanoslo por email con un clic';
        status.append(a, ' (se abre tu correo con los datos ya escritos).');
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });
  });

  function pick(obj, keys) {
    const o = {};
    keys.forEach(k => { if (obj[k]) o[k] = obj[k]; });
    return o;
  }

  // "Ahora no" en el paso opcional
  document.querySelectorAll('[data-skip]').forEach(b => b.addEventListener('click', () => show(document.querySelector(b.dataset.skip))));

  // Compartir con amigas
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Enlace copiado'; }
    catch { b.textContent = b.dataset.copy; }
  }));

  // En la portada el logo de la barra aparece solo cuando el RESET grande ya no se ve
  const logo = document.querySelector('[data-hide-on-hero]');
  const big = document.querySelector('.hero .wordmark');
  if (logo && big && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => logo.classList.toggle('is-off', e.isIntersecting), { rootMargin: '-68px 0px 0px 0px' }).observe(big);
  }

  // Vídeo de la portada: solo se mueve si la persona no ha pedido reducir el movimiento
  document.querySelectorAll('video[data-loop]').forEach(v => {
    if (reduce) { v.removeAttribute('autoplay'); v.pause(); return; }
    v.play().catch(() => {});
  });
})();
