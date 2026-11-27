'use strict';
const E=globalThis.SavantiEngine;
const $=id=>document.getElementById(id);
const money=n=>n===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sampleClaims=`reference,date,expected_amount,drug
SV-1048,2026-11-19,425.00,Example medication A
SV-1047,2026-11-16,312.50,Example medication B
SV-1046,2026-11-10,680.00,Example medication C
SV-1045,2026-10-28,215.00,Example medication A
SV-1044,2026-10-20,540.00,Example medication D
SV-1043,2026-11-04,150.00,Example medication B
SV-1042,2026-10-05,0.00,Example medication C
SV-1041,2026-09-18,330.00,Example medication D`;
const samplePayments=`payment_id,reference,date,paid_amount
PM-2001,SV-1048,2026-11-24,425.00
PM-2002,SV-1047,2026-11-22,200.00
PM-2003,SV-1046,2026-11-21,400.00
PM-2004,SV-1046,2026-11-24,280.00
PM-2005,SV-1044,2026-11-01,540.00
PM-2006,SV-1043,2026-11-08,175.00
PM-2007,SV-1042,2026-10-12,220.00
PM-2008,SV-1042,2026-10-14,-220.00
PM-2009,SV-1099,2026-11-20,84.50`;
let claims=[],payments=[],results=[],filter='all',mode='sample',reportDate='2026-11-26';
const review=r=>!['Matched','Reversed'].includes(r.status);
function notify(message){$('notice').textContent=message;$('notice').hidden=false;}
function loadSample(){reportDate='2026-11-26';$('as-of').value=reportDate;claims=E.parse(sampleClaims,'claims',reportDate);payments=E.parse(samplePayments,'payments',reportDate);mode='sample';filter='all';$('search').value='';$('notice').hidden=true;$('import-form').reset();render();}
function visible(){const q=$('search').value.toLowerCase().trim();return results.filter(r=>(filter==='all'||filter==='review'&&review(r)||filter==='matched'&&r.status==='Matched')&&(!q||(r.reference+' '+r.drug).toLowerCase().includes(q)));}
function render(){
 results=E.reconcile(claims,payments,reportDate);
 const linked=results.filter(r=>r.expected!==null),positive=linked.filter(r=>r.balance>0);
 const sum=(rs,key)=>rs.reduce((a,r)=>a+r[key],0);
 $('expected').textContent=money(sum(linked,'expected'));$('paid').textContent=money(sum(linked,'paid'));$('open').textContent=money(sum(positive,'balance'));$('review-count').textContent=results.filter(review).length;
 $('expect-count').textContent=claims.length+' supplied expectations';$('review-caption').textContent=results.filter(r=>r.status==='Unlinked').length+' unlinked payment reference(s) included';
 $('mode').textContent=mode==='sample'?'SAMPLE DATA':'IMPORTED DATA';$('session-description').textContent=mode==='sample'?'Explore a fictional pharmacy’s payment activity.':'Your files are held in this tab only. Reload to clear.';
 $('source-caption').textContent=mode==='sample'?'Synthetic November 2026 dataset':claims.length+' expectations · '+payments.length+' payment records';
 const buckets=[['0–14 days',0,14],['15–30 days',15,30],['31–60 days',31,60],['61+ days',61,Infinity]].map(([label,lo,hi])=>({label,amount:sum(positive.filter(r=>r.age>=lo&&r.age<=hi),'balance')}));
 const max=Math.max(...buckets.map(b=>b.amount),1);
 $('aging-bars').replaceChildren(...buckets.map(b=>{const row=document.createElement('div');row.className='bar-row';const label=document.createElement('span');label.textContent=b.label;const track=document.createElement('div');track.className='track';track.setAttribute('aria-hidden','true');const fill=document.createElement('div');fill.className='fill';fill.style.width=(b.amount/max*100)+'%';track.append(fill);const amount=document.createElement('strong');amount.textContent=money(b.amount);row.append(label,track,amount);return row;}));
 const items=[['Positive open balances',money(sum(positive,'balance'))],['Excess linked payments',money(linked.reduce((a,r)=>a+Math.max(0,-r.balance),0))],['Unlinked payments (net)',money(sum(results.filter(r=>r.status==='Unlinked'),'paid'))]];
 $('queue').innerHTML=items.map(([a,b])=>`<div class="queue-line"><span>${a}</span><strong>${b}</strong></div>`).join('');renderTable();
}
function renderTable(){
 document.querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===filter;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);});
 const rows=visible();$('rows').innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${esc(r.reference)}</strong><small>${esc(r.drug)}</small></td><td>${r.expected===null?'Not supplied':esc(r.date)}</td><td class="number">${money(r.expected)}</td><td class="number">${money(r.paid)}</td><td class="number difference">${money(r.balance)}</td><td><span class="badge ${r.status.toLowerCase().replaceAll(' ','-')}">${r.status}</span></td><td><button class="view-button" data-reference="${esc(r.reference)}" aria-label="View ${esc(r.reference)} details">View</button></td></tr>`).join(''):'<tr><td colspan="7" class="empty">No references match this view. Try another filter or search.</td></tr>';
 $('row-count').textContent=rows.length+' of '+results.length+' references';$('table-caption').textContent=filter==='all'?'All references in this session':filter==='review'?'Differences and unlinked payments requiring investigation':'Equal expected and paid amounts';$('export').disabled=!rows.length;
}
function download(name,content){const blob=new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function openImport(){$('import-error').hidden=true;$('import-dialog').showModal();}
$('import-open').onclick=openImport;$('nav-import').onclick=openImport;
$('privacy').onclick=$('nav-method').onclick=()=>$('method-dialog').showModal();
$('reset').onclick=()=>{if(mode!=='sample'&&!confirm('Clear imported records and load the sample? Download a report first if needed.'))return;loadSample();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderTable();});$('search').oninput=renderTable;
$('as-of').onchange=()=>{const d=$('as-of').value;if(!E.date(d)||[...claims,...payments].some(r=>r.date>d)){notify('Choose a report date on or after every date in the current files.');$('as-of').value=reportDate;return;}reportDate=d;$('notice').hidden=true;render();};
$('claims-template').onclick=()=>download('savanti-expectations-template.csv',sampleClaims);
$('payments-template').onclick=()=>download('savanti-payments-template.csv',samplePayments);
$('import-form').onsubmit=async event=>{
 event.preventDefault();const btn=$('run-import');btn.disabled=true;btn.textContent='Checking files…';$('import-error').hidden=true;
 try{
  const cf=$('claims-file').files[0],pf=$('payments-file').files[0];
  if(!cf||!pf||!$('safe-confirm').checked)throw Error('Select both files and confirm the data statement.');
  if([cf,pf].some(f=>f.size>2*1024*1024||!f.name.toLowerCase().endsWith('.csv')))throw Error('Use .csv files no larger than 2 MB each.');
  const [ct,pt]=await Promise.all([cf.text(),pf.text()]);
  let newClaims,newPayments;
  try{newClaims=E.parse(ct,'claims',reportDate);}catch(e){throw Error('Expectations: '+e.message);}
  try{newPayments=E.parse(pt,'payments',reportDate);}catch(e){throw Error('Payments: '+e.message);}
  claims=newClaims;payments=newPayments;mode='imported';filter='all';$('search').value='';render();$('import-dialog').close();$('import-form').reset();notify('Reconciliation complete. Imported records replace the previous session. No files were uploaded.');
 }catch(e){$('import-error').textContent=e.message;$('import-error').hidden=false;}
 finally{btn.disabled=false;btn.textContent='Reconcile files';}
};
$('export').onclick=()=>{
 const header=['report_date','data_mode','reference','drug','expected_date','expected_amount','net_paid_amount','difference','status','age_days','payment_count'];
 const lines=visible().map(r=>[reportDate,mode,r.reference,r.drug,r.expected===null?'':r.date,r.expected===null?'':r.expected/100,r.paid/100,r.balance===null?'':r.balance/100,r.status,r.age??'',r.payments.length]);
 download('savanti-'+mode+'-reconciliation-'+reportDate+'.csv',[header,...lines].map(row=>row.map(E.escapeCSV).join(',')).join('\r\n'));notify('Downloaded the '+visible().length+' references in the current view. This report records differences, not verified amounts owed.');
};
const explanations={Matched:'The net recorded payments equal the supplied expectation. This does not verify bank receipt or whether the expectation is correct.',Partial:'Payments are linked, but their net total is below the supplied expectation. Review adjustments, timing, and the expected amount.',Unpaid:'No payment records match this reference. Check identifier mapping and payment timing before treating the balance as overdue.',Overpaid:'Net recorded payments exceed the supplied expectation. Check for duplicate source entries, adjustments, or an incorrect expectation.',Unlinked:'No expectation has this exact reference. Confirm the identifier and source period. This payment is excluded from linked totals.',Reversed:'The expectation is zero and recorded payments net to zero. Review the source reversal if needed.','Reversal review':'The expectation is zero but recorded payments do not net to zero. Review reversal and credit records.'};
$('rows').onclick=event=>{
 const b=event.target.closest('[data-reference]');if(!b)return;const r=results.find(x=>x.reference===b.dataset.reference);$('detail-title').textContent=r.reference;
 $('detail-content').innerHTML=`<p>${esc(r.drug)} · <span class="badge ${r.status.toLowerCase().replaceAll(' ','-')}">${r.status}</span></p><div class="detail-metrics"><div><span>Expected</span><strong>${money(r.expected)}</strong></div><div><span>Net paid</span><strong>${money(r.paid)}</strong></div><div><span>Difference</span><strong>${money(r.balance)}</strong></div></div><p class="detail-note">${explanations[r.status]}</p><h3>Recorded payments (${r.payments.length})</h3>${r.payments.length?r.payments.map(p=>`<div class="payment-line"><div>${esc(p.payment_id)}<small>${esc(p.date)}</small></div><strong>${money(p.amount)}</strong></div>`).join(''):'<p>No payment records linked.</p>'}<p>${r.age===null?'No expected date available.':r.age+' days since the supplied expected date.'} Report as of ${reportDate}.</p>`;
 $('detail-dialog').showModal();
};
loadSample();
