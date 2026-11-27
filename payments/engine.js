/* Deterministic, integer-cent reconciliation. No network or persistence. */
(function(root){
'use strict';
function csv(text){
 const rows=[];let row=[],field='',quoted=false,closed=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;}
  else if(c==='"'){if(field||closed)throw Error('Unexpected quote in CSV.');quoted=true;}
  else if(c===','||c==='\n'||c==='\r'){
   row.push(field);field='';closed=false;
   if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(x=>x.trim()))rows.push(row);row=[];}
  }else {if(closed)throw Error('Unexpected text after a quoted CSV field.');field+=c;}
 }
 if(quoted)throw Error('Unclosed quote in CSV.');
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
function cents(value){
 const s=String(value).trim();
 if(!/^-?\d{1,9}(\.\d{1,2})?$/.test(s))throw Error('Use a plain dollar amount, such as 125.50 (no currency symbols or commas).');
 const negative=s.startsWith('-'),parts=s.replace('-','').split('.');
 return (Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0')))*(negative?-1:1);
}
function date(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
function parse(text,kind,asOf){
 const rows=csv(text);if(rows.length<2)throw Error('Include a header and at least one data row.');
 if(rows.length>10001)throw Error('Maximum 10,000 rows per file.');
 const headers=rows.shift().map(x=>x.trim());
 const expected=kind==='claims'?['reference','date','expected_amount','drug']:['payment_id','reference','date','paid_amount'];
 if(headers.length!==4||expected.some(h=>!headers.includes(h))||new Set(headers).size!==4)throw Error('Required columns: '+expected.join(', ')+'. Extra columns are not accepted.');
 const seen=new Set();
 return rows.map((r,i)=>{
  if(r.length!==headers.length)throw Error('Row '+(i+2)+': column count does not match the header.');
  const o=Object.fromEntries(headers.map((h,j)=>[h,r[j].trim()]));
  if(!o.reference||o.reference.length>100)throw Error('Row '+(i+2)+': reference must be 1–100 characters.');
  if(!date(o.date)||o.date>asOf)throw Error('Row '+(i+2)+': use a valid YYYY-MM-DD date on or before the report date.');
  const id=kind==='claims'?o.reference:o.payment_id;
  if(!id||id.length>100||seen.has(id))throw Error('Row '+(i+2)+': missing or duplicate '+(kind==='claims'?'reference':'payment_id')+'.');
  seen.add(id);
  let amount;try{amount=cents(o[kind==='claims'?'expected_amount':'paid_amount']);}catch(e){throw Error('Row '+(i+2)+': '+e.message);}
  if(kind==='claims'&&amount<0)throw Error('Row '+(i+2)+': expected amount must be nonnegative. Use zero for a fully reversed expectation.');
  if(kind==='claims'&&o.drug.length>160)throw Error('Row '+(i+2)+': drug label is too long.');
  return {...o,amount};
 });
}
function reconcile(claims,payments,asOf){
 if(!date(asOf))throw Error('Choose a valid report date.');
 const groups=new Map();for(const p of payments){if(!groups.has(p.reference))groups.set(p.reference,[]);groups.get(p.reference).push(p);}
 const out=claims.map(c=>{
  const ps=groups.get(c.reference)||[];groups.delete(c.reference);
  const paid=ps.reduce((a,p)=>a+p.amount,0),balance=c.amount-paid;
  let status=balance===0?'Matched':balance<0?'Overpaid':ps.length?'Partial':'Unpaid';
  if(c.amount===0)status=paid===0?'Reversed':'Reversal review';
  return {reference:c.reference,drug:c.drug||'Unspecified',date:c.date,expected:c.amount,paid,balance,status,payments:ps,age:Math.floor((Date.parse(asOf+'T00:00:00Z')-Date.parse(c.date+'T00:00:00Z'))/86400000)};
 });
 for(const [reference,ps] of groups){out.push({reference,drug:'No matching expectation',date:ps.map(p=>p.date).sort()[0],expected:null,paid:ps.reduce((a,p)=>a+p.amount,0),balance:null,status:'Unlinked',payments:ps,age:null});}
 return out;
}
function escapeCSV(value){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s)&&typeof value!=='number')s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
const api={csv,cents,date,parse,reconcile,escapeCSV};
root.SavantiEngine=api;
})(globalThis);
