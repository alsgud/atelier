/* Sign in: the one screen without the shell (nothing else can load before the token). One field, one button.
   The form posts to /login as today; a wrong token comes back as ?login=failed, drawn here as ?v=wrong. */
(() => {
  const q = new URLSearchParams(location.search);
  const root = document.documentElement;
  root.dataset.theme = q.get('theme') === 'light' ? 'light' : 'dark';
  if (q.get('motion') === 'reduce') root.dataset.motion = 'reduce';
  const v = q.get('v') || '';
  const I = n => `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
  document.getElementById('app').innerHTML = `
    <form class="l-card" method="post" action="#" novalidate>
      <span class="l-mark">${window.mark2('N1', 40)}</span>
      <h1>Sign in to Atelier</h1>
      <p class="l-lede">Paste the access token that <code>atelier open</code> prints on your PC. You do this once on each device.</p>
      <div class="field">
        <label class="field-label" for="token">Access token</label>
        <input class="input" id="token" name="token" type="password" autocomplete="current-password" spellcheck="false" required
          ${v === 'wrong' ? 'value="at_9f2c41e07b" aria-invalid="true" aria-describedby="t-err"' : 'aria-describedby="t-help"'} autofocus>
        ${v === 'wrong' ? `<span class="field-error" id="t-err" role="alert">${I('alert')}<span>That token didn’t match. Copy it again from <code>atelier open</code>.</span></span>`
          : '<span class="field-help" id="t-help">It stays signed in on this device until you clear its data.</span>'}
      </div>
      <button class="btn btn-primary l-go" type="submit"${v === 'busy' ? ' aria-busy="true" disabled' : ''}>${v === 'busy' ? 'Signing in…' : 'Sign in'}</button>
    </form>`;
  const f = document.querySelector('form'), inp = f.querySelector('input');
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (!inp.value.trim()) {
      const msg = f.querySelector('.field-help, .field-error');
      msg.className = 'field-error'; msg.id = 't-err'; msg.setAttribute('role', 'alert'); msg.innerHTML = `${I('alert')}<span>Paste the token first.</span>`;
      inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', 't-err'); inp.focus(); return;
    }
    const b = f.querySelector('.l-go'); b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = 'Signing in…';
    setTimeout(() => { location.href = 'inbox.html' + (q.get('theme') ? `?theme=${q.get('theme')}` : ''); }, 700);
  });
})();
