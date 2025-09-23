const state = {
  writeUnlocked: false,
  volunteerName: null,
  family: null,
  lastSearch: ''
};

const els = {
  session: document.getElementById('sessionStatus'),
  pin: document.getElementById('pinInput'),
  vol: document.getElementById('volNameInput'),
  unlock: document.getElementById('unlockBtn'),
  lock: document.getElementById('lockBtn'),
  search: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  addFamilyBtn: document.getElementById('addFamilyBtn'),
  familyList: document.getElementById('familyList'),
  familyDetail: document.getElementById('familyDetail'),
  familyName: document.getElementById('familyName'),
  balance: document.getElementById('balance'),
  amount: document.getElementById('amountInput'),
  note: document.getElementById('noteInput'),
  credit: document.getElementById('creditBtn'),
  debit: document.getElementById('debitBtn'),
  txnList: document.getElementById('txnList'),
  feedBtn: document.getElementById('refreshFeedBtn'),
  feedList: document.getElementById('feedList'),
};

function dollars(cents){ return `$${(cents/100).toFixed(2)}`; }

function setSessionUI(){
  els.session.textContent = state.writeUnlocked
    ? `✅ Cashier ${state.volunteerName ? '('+state.volunteerName+')' : ''} · Write access`
    : '🔒 Locked';
  els.credit.disabled = !state.writeUnlocked || !state.family;
  els.debit.disabled  = !state.writeUnlocked || !state.family;
}

async function fetchJSON(url, opts){
  const res = await fetch(url, opts);
  if(!res.ok){
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

async function searchFamilies(){
  const q = els.search.value.trim();
  state.lastSearch = q;
  const rows = await fetchJSON(`/.netlify/functions/families?search=${encodeURIComponent(q)}`);
  els.familyList.innerHTML = '';
  rows.forEach(r=>{
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = 'Open';
    btn.addEventListener('click', ()=> openFamily(r.id, r.family_name));
    const kids = r.kids_name ? ` — ${r.kids_name}` : '';
    li.innerHTML = `<span>${r.family_name}${kids}</span>`;
    li.appendChild(btn);
    els.familyList.appendChild(li);
  });
}

async function openFamily(id, name){
  const data = await fetchJSON(`/.netlify/functions/family?id=${id}`);
  state.family = data;
  els.familyDetail.classList.remove('hidden');
  els.familyName.textContent = data.family_name + (data.kids_name ? ' — ' + data.kids_name : '');
  els.balance.textContent = dollars(data.balance_cents);
  els.txnList.innerHTML = '';
  data.recent_transactions.forEach(tx => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${new Date(tx.created_at).toLocaleString()} — ${tx.type.toUpperCase()} ${dollars(tx.amount_cents)} — ${tx.note || ''}</span><span>${tx.entered_by_name || ''}</span>`;
    els.txnList.appendChild(li);
  });
  setSessionUI();
}

async function addFamily(){
  const name = prompt('New family name?');
  const kids = name ? prompt('Kids name(s)? (optional)') : null;
  if(!name) return;
  if(!state.writeUnlocked){
    alert('Unlock with Write PIN first.');
    return;
  }
  try {
    await fetchJSON('/.netlify/functions/families', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ family_name: name.trim(), kids_name: (kids||'').trim(), pin: sessionStorage.getItem('WRITE_PIN') })
    });
    alert('Family added.');
    els.search.value = name.trim();
    await searchFamilies();
  } catch(e){
    alert(e.message);
  }
}

async function submitTxn(kind){
  if(!state.family){ alert('Pick a family first.'); return; }
  if(!state.writeUnlocked){ alert('Unlock with Write PIN.'); return; }
  const amt = parseFloat(els.amount.value);
  const note = els.note.value.trim();
  if(!amt || amt <= 0){ alert('Enter amount > 0'); return; }
  try {
    const payload = {
      pin: sessionStorage.getItem('WRITE_PIN'),
      family_id: state.family.id,
      type: kind,
      amount: amt,
      note,
      volunteer_name: state.volunteerName || null,
      client_request_id: crypto.randomUUID()
    };
    const res = await fetchJSON('/.netlify/functions/transactions', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    els.balance.textContent = dollars(res.balance_cents);
    els.amount.value=''; els.note.value='';
    await openFamily(state.family.id, state.family.family_name);
    await refreshFeed();
  } catch(e){
    alert(e.message);
  }
}

async function refreshFeed(){
  const rows = await fetchJSON('/.netlify/functions/transactions?limit=20');
  els.feedList.innerHTML = '';
  rows.forEach(r=>{
    const li = document.createElement('li');
    const sign = r.type === 'credit' ? '+' : '-';
    li.innerHTML = `<span>${new Date(r.created_at).toLocaleString()} — ${r.family_name} — ${r.type.toUpperCase()} ${sign}$${(r.amount_cents/100).toFixed(2)} — ${r.note || ''}</span><span>${r.entered_by_name || ''}</span>`;
    els.feedList.appendChild(li);
  });
}

// Event bindings
els.unlock.addEventListener('click', ()=>{
  const pin = els.pin.value.trim();
  if(!pin){ alert('Enter the Write PIN.'); return; }
  sessionStorage.setItem('WRITE_PIN', pin);
  const vc = els.vol.value.trim();
  state.volunteerName = vc || null;
  state.writeUnlocked = true;
  setSessionUI();
});
els.lock.addEventListener('click', ()=>{
  sessionStorage.removeItem('WRITE_PIN');
  state.writeUnlocked = false;
  state.volunteerName = null;
  setSessionUI();
});
els.searchBtn.addEventListener('click', searchFamilies);
els.addFamilyBtn.addEventListener('click', addFamily);
els.credit.addEventListener('click', ()=> submitTxn('credit'));
els.debit.addEventListener('click', ()=> submitTxn('debit'));
els.feedBtn.addEventListener('click', refreshFeed);

// Initial load
refreshFeed();
