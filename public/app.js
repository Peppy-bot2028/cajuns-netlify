// Strict, server-trust front-end: all math numeric, rely on server balance, correct signs.
(function(){
  const state = { writeUnlocked:false, volunteerName:null, family:null };

  const els = {
    pin: document.getElementById('pinInput'),
    vol: document.getElementById('volNameInput'),
    unlock: document.getElementById('unlockBtn'),
    search: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    familyList: document.getElementById('familyList'),
    familyDetail: document.getElementById('familyDetail'),
    familyName: document.getElementById('familyName'),
    balance: document.getElementById('balance'),
    amount: document.getElementById('amountInput'),
    note: document.getElementById('noteInput'),
    credit: document.getElementById('creditBtn'),
    debit: document.getElementById('debitBtn'),
    txnList: document.getElementById('txnList'),
  };

  function dollars(cents){ return `$${(Number(cents||0)/100).toFixed(2)}`; }

  async function fetchJSON(url, opts){
    const res = await fetch(url, opts);
    if(!res.ok){ throw new Error(await res.text() || res.statusText); }
    return res.json();
  }

  async function searchFamilies(){
    const q = els.search ? els.search.value.trim() : '';
    const rows = await fetchJSON(`/.netlify/functions/families?search=${encodeURIComponent(q)}`);
    els.familyList.innerHTML = '';
    for (const r of rows){
      const li = document.createElement('li');
      li.innerHTML = `<span>${r.family_name}${r.kids_name? ' — '+r.kids_name : ''}</span>`;
      const btn = document.createElement('button');
      btn.textContent = 'Open';
      btn.addEventListener('click', ()=> openFamily(r.id));
      li.appendChild(btn);
      els.familyList.appendChild(li);
    }
  }

  async function openFamily(id){
    const data = await fetchJSON(`/.netlify/functions/family?id=${id}`);
    state.family = data;
    if (els.familyDetail) els.familyDetail.classList.remove('hidden');
    if (els.familyName) els.familyName.textContent = data.family_name + (data.kids_name ? ' — ' + data.kids_name : '');
    if (els.balance) els.balance.textContent = dollars(data.balance_cents);
    if (els.txnList){
      els.txnList.innerHTML = '';
      (data.recent_transactions || []).forEach(tx => {
        const amt = Number(tx.amount_cents ?? Math.round(Number(tx.amount||0)*100));
        const sign = (tx.type === 'credit') ? '+' : '-';
        const li = document.createElement('li');
        li.innerHTML = `<span>${new Date(tx.created_at).toLocaleString()} — ${tx.type.toUpperCase()} ${sign}${(amt/100).toFixed(2)} — ${tx.note || ''}</span><span>${tx.entered_by_name || ''}</span>`;
        els.txnList.appendChild(li);
      });
    }
    setWrite(state.writeUnlocked);
  }

  function setWrite(on){
    const allow = !!on && !!state.family;
    if (els.credit) els.credit.disabled = !allow;
    if (els.debit) els.debit.disabled = !allow;
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
      // Trust server balance
      if (els.balance) els.balance.textContent = dollars(res.balance_cents);
      els.amount.value=''; els.note.value='';
      await openFamily(state.family.id);
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
    // capture cashier name if present
    const vc = (document.getElementById('volNameInput')?.value || '').trim();
    state.volunteerName = vc || null;
    setWrite(true);
  });
  if (els.searchBtn) els.searchBtn.addEventListener('click', searchFamilies);
  if (els.credit) els.credit.addEventListener('click', ()=> submitTxn('credit'));
  if (els.debit) els.debit.addEventListener('click', ()=> submitTxn('debit'));

  try{ searchFamilies(); }catch(e){}
})();