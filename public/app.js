
// Instant-balance patch:
// - After POST, update family panel balance immediately
// - Also update the matching list badge without reopening
// - Prettier list + keeps strict math
(function(){
  const state = { writeUnlocked:false, volunteerName:null, family:null };

  const els = {
    session: document.getElementById('sessionStatus'),
    pin: document.getElementById('pinInput'),
    vol: document.getElementById('volNameInput'),
    unlock: document.getElementById('unlockBtn'),
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

  function dollars(c){ return `$${(Number(c||0)/100).toFixed(2)}`; }
  function mkBadge(n){
    const span = document.createElement('span');
    span.className = 'badge ' + (n>0 ? 'pos' : n<0 ? 'neg' : 'zero');
    span.textContent = dollars(n);
    return span;
  }

  async function fetchJSON(url, opts){
    const res = await fetch(url, opts);
    if(!res.ok){ throw new Error(await res.text() || res.statusText); }
    return res.json();
  }

  function setSessionUI(){
    if(!els.session) return;
    els.session.textContent = state.writeUnlocked
      ? `✅ Cashier ${state.volunteerName ? '('+state.volunteerName+')' : ''} · Write access`
      : '🔒 Locked';
    if (els.credit) els.credit.disabled = !state.writeUnlocked || !state.family;
    if (els.debit)  els.debit.disabled  = !state.writeUnlocked || !state.family;
  }

  function renderFamilyListItem(r){
    const li = document.createElement('li');
    li.dataset.familyId = String(r.id);

    const left = document.createElement('span');
    left.textContent = r.family_name + (r.kids_name ? ` — ${r.kids_name}` : '');

    const badge = document.createElement('span');
    badge.className = 'badge zero';
    badge.textContent = '…';
    badge.dataset.role = 'balance-badge';

    const btn = document.createElement('button');
    btn.textContent = 'Open';
    btn.addEventListener('click', ()=> openFamily(r.id));

    li.appendChild(left);
    li.appendChild(badge);
    li.appendChild(btn);
    return li;
  }

  async function hydrateBadge(li, id){
    try{
      const data = await fetchJSON(`/.netlify/functions/family?id=${id}`);
      const n = Number(data.balance_cents||0);
      const badge = li.querySelector('[data-role="balance-badge"]');
      if (badge){
        const fresh = mkBadge(n);
        li.replaceChild(fresh, badge);
        fresh.dataset.role = 'balance-badge';
      }
    }catch(_){}
  }

  async function searchFamilies(){
    const q = els.search ? els.search.value.trim() : '';
    const rows = await fetchJSON(`/.netlify/functions/families?search=${encodeURIComponent(q)}`);
    els.familyList.innerHTML = '';

    rows.forEach(r=>{
      const li = renderFamilyListItem(r);
      els.familyList.appendChild(li);
      hydrateBadge(li, r.id);
    });
  }

  async function openFamily(id){
    const data = await fetchJSON(`/.netlify/functions/family?id=${id}`);
    state.family = data;
    if (els.familyDetail) els.familyDetail.style.display = 'block';
    if (els.familyName) els.familyName.textContent = data.family_name + (data.kids_name ? ' — ' + data.kids_name : '');
    if (els.balance) els.balance.textContent = dollars(data.balance_cents);
    if (els.txnList){
      els.txnList.innerHTML = '';
      (data.recent_transactions || []).forEach(tx => {
        const amt = Number(tx.amount_cents ?? Math.round(Number(tx.amount||0)*100));
        const sign = (tx.type === 'credit') ? '+' : '-';
        const li = document.createElement('li');
        li.innerHTML = `<span>${new Date(tx.created_at).toLocaleString()} — ${tx.type.toUpperCase()} ${sign}$${(amt/100).toFixed(2)} — ${tx.note || ''}</span><span class="small">${tx.entered_by_name || ''}</span>`;
        els.txnList.appendChild(li);
      });
    }
    setSessionUI();
  }

  async function refreshFeed(){
    if(!els.feedList) return;
    const rows = await fetchJSON('/.netlify/functions/transactions?limit=20');
    els.feedList.innerHTML = '';
    rows.forEach(r=>{
      const amt = Number(r.amount_cents ?? Math.round(Number(r.amount||0)*100));
      const sign = r.type === 'credit' ? '+' : '-';
      const li = document.createElement('li');
      li.innerHTML = `<span>${new Date(r.created_at).toLocaleString()} — ${r.family_name} — ${r.type.toUpperCase()} ${sign}$${(amt/100).toFixed(2)} — ${r.note || ''}</span><span class="small">${r.entered_by_name || ''}</span>`;
      els.feedList.appendChild(li);
    });
  }

  function updateListBadgeFor(id, newBalanceCents){
    const li = els.familyList?.querySelector('li[data-family-id="'+String(id)+'"]');
    if (!li) return;
    const badge = li.querySelector('[data-role="balance-badge"]');
    const fresh = mkBadge(Number(newBalanceCents||0));
    if (badge){
      fresh.dataset.role = 'balance-badge';
      li.replaceChild(fresh, badge);
    } else {
      // append if missing
      fresh.dataset.role = 'balance-badge';
      li.insertBefore(fresh, li.lastChild);
    }
  }

  let submitting = false;
  async function submitTxn(kind){
    if(submitting) return;
    if(!state.family){ alert('Pick a family first.'); return; }
    if(!state.writeUnlocked){ alert('Unlock with Write PIN.'); return; }
    const amt = Number(els.amount.value);
    if(!isFinite(amt) || amt <= 0){ alert('Enter a valid amount'); return; }
    const note = (els.note.value||'').trim();
    submitting = true;
    try{
      const res = await fetchJSON('/.netlify/functions/transactions', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          pin: sessionStorage.getItem('WRITE_PIN'),
          family_id: state.family.id,
          type: kind,
          amount: amt, // dollars only
          note,
          volunteer_name: state.volunteerName || null,
          client_request_id: crypto.randomUUID()
        })
      });
      // 1) Update the family panel balance immediately
      const newBal = Number(res.balance_cents || 0);
      if (els.balance) els.balance.textContent = dollars(newBal);
      // 2) Update the list badge for this family
      updateListBadgeFor(state.family.id, newBal);
      // 3) Refresh recent list just for this family
      await openFamily(state.family.id);
      // 4) And the global feed (so everyone sees the new row)
      await refreshFeed();

      els.amount.value=''; els.note.value='';
    }catch(e){
      alert(e.message || e);
    }finally{
      submitting = false;
    }
  }

  if (els.unlock) els.unlock.addEventListener('click', ()=>{
    const pin = (els.pin.value || '').trim();
    if(!pin){ alert('Enter Write PIN'); return; }
    sessionStorage.setItem('WRITE_PIN', pin);
    state.volunteerName = (els.vol?.value || '').trim() || null;
    state.writeUnlocked = true;
    setSessionUI();
  });

  if (els.searchBtn) els.searchBtn.addEventListener('click', searchFamilies);
  if (els.addFamilyBtn) els.addFamilyBtn.addEventListener('click', async ()=>{
    const name = prompt('New family name?');
    const kids = name ? prompt('Kids name(s)? (optional)') : null;
    if(!name) return;
    if(!state.writeUnlocked){ alert('Unlock with Write PIN first.'); return; }
    try {
      await fetchJSON('/.netlify/functions/families', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ family_name: name.trim(), kids_name: (kids||'').trim(), pin: sessionStorage.getItem('WRITE_PIN') })
      });
      alert('Family added.');
      if (els.search) els.search.value = name.trim();
      await searchFamilies();
    } catch(e){
      alert(e.message);
    }
  });
  if (els.credit) els.credit.addEventListener('click', ()=> submitTxn('credit'));
  if (els.debit) els.debit.addEventListener('click', ()=> submitTxn('debit'));
  if (els.feedBtn) els.feedBtn.addEventListener('click', refreshFeed);

  // initial load
  try{ refreshFeed(); }catch(e){}
  try{ searchFamilies(); }catch(e){}
  setSessionUI();
})();
