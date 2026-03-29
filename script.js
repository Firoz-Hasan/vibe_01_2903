// Client-side validation and mock submission
(function(){
  const API_BASE = (typeof window !== 'undefined' && typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
  const FRONTEND_BASE = (typeof window !== 'undefined' && typeof window.FRONTEND_BASE !== 'undefined') ? window.FRONTEND_BASE : '';
  const form = document.getElementById('register-form');
  console.debug('Registration script loaded', { API_BASE, FRONTEND_BASE });
  const pw = document.getElementById('password');
  const cpw = document.getElementById('confirmPassword');
  const toggle = document.getElementById('togglePassword');
  const meter = document.getElementById('pw-strength');
  const success = document.getElementById('success');
  const createAnother = document.getElementById('createAnother');

  function showError(name, message){
    const el = document.querySelector(`small.error[data-for="${name}"]`);
    if(el) el.textContent = message || '';
  }

  function showGlobal(msg, isError = true){
    const g = document.getElementById('global-msg');
    if(!g) return;
    g.textContent = msg || '';
    if(isError) g.classList.remove('success'); else g.classList.add('success');
    g.classList.remove('hidden');
  }

  function validateEmail(v){
    return /\S+@\S+\.\S+/.test(v);
  }

  function passwordScore(p){
    let score = 0;
    if(p.length >= 8) score++;
    if(/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if(/\d/.test(p)) score++;
    if(/[^A-Za-z0-9]/.test(p)) score++;
    return score; // 0..4
  }

  function updatePwMeter(){
    const v = pw.value || '';
    const s = passwordScore(v);
    meter.value = s;
    // color via value -> by changing meter's background isn't widely stylable, but it's fine for demo
  }

  toggle.addEventListener('click', ()=>{
    const t = pw.type === 'password' ? 'text' : 'password';
    pw.type = t; cpw.type = t;
    toggle.textContent = pw.type === 'password' ? '👁️' : '🙈';
  });

  pw.addEventListener('input', ()=>{
    updatePwMeter();
  });

  function validateForm(){
    let ok = true;
    const values = Object.fromEntries(new FormData(form).entries());
    const errors = [];
    let firstInvalid = null;

    if(!values.fullName || values.fullName.trim().length < 2){
      const msg = 'Please enter your full name.';
      showError('fullName',msg); ok = false; errors.push(msg); if(!firstInvalid) firstInvalid = document.getElementById('fullName');
    } else showError('fullName','');

    if(!validateEmail(values.email||'')){
      const msg = 'Please enter a valid email.';
      showError('email',msg); ok = false; errors.push(msg); if(!firstInvalid) firstInvalid = document.getElementById('email');
    } else showError('email','');

    if(!values.username || values.username.length < 3){
      const msg = 'Choose a username (3+ characters).';
      showError('username',msg); ok = false; errors.push(msg); if(!firstInvalid) firstInvalid = document.getElementById('username');
    } else showError('username','');

    const score = passwordScore(values.password||'');
    if(score < 2){
      const msg = 'Password is too weak (use 8+ chars, mix cases, numbers, symbols).';
      showError('password',msg); ok = false; errors.push(msg); if(!firstInvalid) firstInvalid = document.getElementById('password');
    } else showError('password','');

    if(values.password !== values.confirmPassword){
      const msg = 'Passwords do not match.';
      showError('confirmPassword',msg); ok = false; errors.push(msg); if(!firstInvalid) firstInvalid = document.getElementById('confirmPassword');
    } else showError('confirmPassword','');

    if(!values.dob){
      const msg = 'Please enter your date of birth.';
      showError('dob',msg); ok = false; errors.push(msg); if(!firstInvalid) firstInvalid = document.getElementById('dob');
    } else showError('dob','');

    if(!values.country){
      const msg = 'Please select a country.';
      showError('country',msg); ok = false; errors.push(msg); if(!firstInvalid) firstInvalid = document.getElementById('country');
    } else showError('country','');

    if(!form.terms.checked){
      const msg = 'You must accept the terms.';
      showError('terms',msg); ok = false; errors.push(msg); if(!firstInvalid) firstInvalid = document.getElementById('terms');
    } else showError('terms','');

    if(!ok){
      // show a concise global message and focus the first invalid field for accessibility
      const summary = errors.length > 1 ? `${errors.length} problems found — please review the form.` : (errors[0] || 'Please fix the form errors.');
      showGlobal(summary, true);
      if(firstInvalid && typeof firstInvalid.focus === 'function') firstInvalid.focus();
    }

    return ok;
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validateForm()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    // log submission attempt (do not log password in plain text)
    try{ console.debug('Submitting registration', { email: data.email, username: data.username, dob: data.dob, country: data.country }); }catch(e){}

    // Try to submit to backend if available, otherwise fall back to localStorage demo
    (async () => {
      try{
        const url = `${API_BASE}/api/register`;
        console.debug('POST', url);
        const res = await fetch(url, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(data)
        });
        console.debug('Received response', res.status);
        if(res.ok){
          // server created user and returned token/user
          const body = await res.json();
          if(body.token) localStorage.setItem('vibe_token', body.token);
          // Redirect to login page after successful registration
          const loginUrl = FRONTEND_BASE ? `${FRONTEND_BASE}/login.html` : 'login.html';
          window.location.href = loginUrl;
          return;
        }
          // if server returned an error, show it and stop (don't silently fallback)
          const err = await res.json().catch(()=>({}));
          const errMsg = (err && (err.error || err.message)) ? (err.error || err.message) : 'Registration failed on server.';
          console.warn('Register failed on server', err);
          showGlobal(errMsg, true);
          return;
      }catch(e){
          console.warn('Backend not available, saving locally', e);
          showGlobal('Backend not available — saving locally as demo.', true);
      }

      // fallback: save to localStorage (no server). In real app, POST to server.
      const users = JSON.parse(localStorage.getItem('vibe_users') || '[]');
      users.push({id:Date.now(), ...data});
      localStorage.setItem('vibe_users', JSON.stringify(users));
      // fallback local save succeeded — redirect to login page
      const loginUrl = FRONTEND_BASE ? `${FRONTEND_BASE}/login.html` : 'login.html';
      window.location.href = loginUrl;
    })();
  });

  createAnother.addEventListener('click', ()=>{
    success.classList.add('hidden');
    form.reset();
    meter.value = 0;
    form.classList.remove('hidden');
    // clear errors
    document.querySelectorAll('small.error').forEach(s=>s.textContent='');
  });

})();
