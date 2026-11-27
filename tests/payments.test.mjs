import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../payments/engine.js',import.meta.url),'utf8'),context);const E=context.SavantiEngine;
const asOf='2026-11-26';
const c=s=>E.parse('reference,date,expected_amount,drug\n'+s,'claims',asOf);
const p=s=>E.parse('payment_id,reference,date,paid_amount\n'+s,'payments',asOf);
test('partial, split, overpaid, unpaid, reversed, unlinked and reversal review stay separate',()=>{
 const cs=c('A,2026-11-01,100.00,A\nB,2026-11-01,50.00,B\nC,2026-11-01,20.00,C\nD,2026-11-01,0.00,D\nE,2026-11-01,50.00,E\nF,2026-11-01,0.00,F');
 const ps=p('1,A,2026-11-02,40\n2,A,2026-11-03,20\n3,B,2026-11-03,60\n4,D,2026-11-03,25\n5,D,2026-11-04,-25\n6,E,2026-11-03,20\n7,E,2026-11-03,30\n8,X,2026-11-03,12\n9,F,2026-11-03,12');
 const rs=E.reconcile(cs,ps,asOf);assert.equal(rs.map(x=>x.status).join(','),'Partial,Overpaid,Unpaid,Reversed,Matched,Reversal review,Unlinked');assert.equal(rs[0].balance,4000);assert.equal(rs[1].balance,-1000);assert.equal(rs[6].expected,null);assert.equal(rs[0].age,25);
});
test('strict cents reject rounding and malformed amounts',()=>{assert.equal(E.cents('0.10')+E.cents('0.20'),30);assert.equal(E.cents('-12.01'),-1201);for(const n of ['1.001','1e3','$5','1,200','NaN',''])assert.throws(()=>E.cents(n));});
test('CSV handles BOM, CRLF, comma, multiline and escaped quotes',()=>{const r=E.parse('\uFEFFreference,date,expected_amount,drug\r\nA,2026-11-01,10,"Example, with ""quotes""\nand line"','claims',asOf);assert.equal(r[0].drug,'Example, with "quotes"\nand line');assert.throws(()=>E.csv('a,"bad'));assert.throws(()=>E.csv('a,"bad"text'));});
test('duplicate identities rejected instead of silently double counting',()=>{assert.throws(()=>c('A,2026-11-01,10,a\nA,2026-11-02,10,b'),/duplicate/);assert.throws(()=>p('P,A,2026-11-01,10\nP,B,2026-11-02,10'),/duplicate/);});
test('bad dates, future dates, extra columns and negative expectations rejected',()=>{for(const d of ['2026-02-30','2026-11-27','11/01/2026'])assert.throws(()=>c(`A,${d},10,A`));assert.throws(()=>c('A,2026-11-01,-5,A'));assert.throws(()=>E.parse('reference,date,expected_amount,drug,patient\nA,2026-11-01,5,A,B','claims',asOf));});
test('exact reference matching does not guess or merge identifiers',()=>{const r=E.reconcile(c('a,2026-11-01,10,a'),p('P,A,2026-11-02,10'),asOf);assert.equal(r.length,2);assert.equal(r[0].status,'Unpaid');assert.equal(r[1].status,'Unlinked');});
test('CSV text export neutralizes formulas but preserves negative numeric balances',()=>{assert.equal(E.escapeCSV('=SUM(A1)'), '"\'=SUM(A1)"');assert.equal(E.escapeCSV(' @cmd'),'"\' @cmd"');assert.equal(E.escapeCSV(-12.5),'"-12.5"');});
