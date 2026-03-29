(function(){
  const API_BASE = (typeof window !== 'undefined' && typeof window.API_BASE !== 'undefined') ? window.API_BASE : '';
  const FRONTEND_BASE = (typeof window !== 'undefined' && typeof window.FRONTEND_BASE !== 'undefined') ? window.FRONTEND_BASE : '';
  const form = document.getElementById('login-form');
  const success = document.getElementById('login-success');
  console.debug('Login script loaded', { API_BASE, FRONTEND_BASE });

  function showError(name, msg){
    const el = document.querySelector(`small.error[data-for="${name}"]`);
    if(el) el.textContent = msg || '';
  }

  function showGlobal(msg, isError = true){
    const g = document.getElementById('global-msg');
    if(!g) return;
    g.textContent = msg || '';
    if(isError) g.classList.remove('success');
    else g.classList.add('success');
    g.classList.remove('hidden');
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    showError('identifier',''); showError('password','');
    const data = Object.fromEntries(new FormData(form).entries());
    console.debug('Submitting login', { identifier: data.identifier });

    try{
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)
      });
      const j = await res.json();
      if(!res.ok){
        const err = j && j.error ? j.error : 'Login failed';
        showError('identifier', err);
        showGlobal(err, true);
        return;
      }
      // store token and show success
  if(j.token) localStorage.setItem('vibe_token', j.token);
  // Show success then go to home page
  showGlobal('Signed in — redirecting…', false);
  const homeUrl = FRONTEND_BASE ? `${FRONTEND_BASE}/home.html` : 'home.html';
  // small delay to let user read success message
  form.classList.add('hidden'); success.classList.remove('hidden');
  setTimeout(()=> window.location.href = homeUrl, 700);
    }catch(err){
      showError('identifier','Network error (is the backend running?)');
    }
  });
})();
