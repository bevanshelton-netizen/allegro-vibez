import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function money(value, currency='ZAR') {
  try { return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(Number(value||0)) }
  catch { return `${currency} ${Number(value||0).toFixed(2)}` }
}

export function BillingPage({ session }) {
  const [plans,setPlans]=useState([]); const [current,setCurrent]=useState(null); const [message,setMessage]=useState('')
  useEffect(()=>{let active=true;(async()=>{if(!supabase||!session)return;const [{data:p},{data:s}]=await Promise.all([
    supabase.from('subscription_plans').select('code,name,monthly_price,currency,platform_fee_percent,features').eq('active',true).order('monthly_price'),
    supabase.from('creator_subscriptions').select('plan_code,status,current_period_end').eq('owner_id',session.user.id).maybeSingle()
  ]);if(active){setPlans(p||[]);setCurrent(s||null)}})();return()=>{active=false}},[session])
  if(!session)return <Gate/>
  function choose(plan){if(plan.code===current?.plan_code)return;setMessage(`${plan.name} is payment-ready. Live checkout will activate when a payment provider is connected; no charge has been made.`)}
  return <main className="page"><div className="eyebrow">COMMERCIAL ACCOUNT</div><h2>Plans & Billing</h2><p>Choose the operating level that matches your creator business. Pricing and platform-fee rules are stored centrally so they can be administered without changing the app.</p>{message&&<div className="notice">{message}</div>}<div className="plan-grid">{plans.map(plan=><article key={plan.code} className={plan.code===current?.plan_code?'plan-card plan-current':'plan-card'}><div className="eyebrow">{plan.code===current?.plan_code?'CURRENT PLAN':plan.code.toUpperCase()}</div><h3>{plan.name}</h3><div className="plan-price">{money(plan.monthly_price,plan.currency)}<small>/month</small></div><p>{plan.platform_fee_percent}% platform fee on tracked royalties.</p><ul>{(plan.features||[]).map(f=><li key={f}>{f}</li>)}</ul><button className="primary" disabled={plan.code===current?.plan_code} onClick={()=>choose(plan)}>{plan.code===current?.plan_code?'Current plan':`Choose ${plan.name}`}</button></article>)}</div></main>
}

export function WalletPage({ session }) {
  const [wallet,setWallet]=useState(null); const [payouts,setPayouts]=useState([]); const [amount,setAmount]=useState(''); const [destination,setDestination]=useState(''); const [message,setMessage]=useState(''); const [saving,setSaving]=useState(false)
  async function load(){if(!supabase||!session)return;const [{data:w},{data:p}]=await Promise.all([
    supabase.from('creator_wallets').select('currency,available_balance,pending_balance,lifetime_paid').eq('owner_id',session.user.id).maybeSingle(),
    supabase.from('payout_requests').select('id,currency,amount,status,destination_label,requested_at,admin_note').eq('owner_id',session.user.id).order('requested_at',{ascending:false}).limit(30)
  ]);setWallet(w||null);setPayouts(p||[])}
  useEffect(()=>{load()},[session])
  if(!session)return <Gate/>
  async function requestPayout(e){e.preventDefault();const n=Number(amount);if(!wallet||!n||n<=0){setMessage('Enter a valid payout amount.');return}if(n>Number(wallet.available_balance||0)){setMessage('Requested amount exceeds the available wallet balance.');return}setSaving(true);const {error}=await supabase.from('payout_requests').insert({owner_id:session.user.id,currency:wallet.currency,amount:n,destination_label:destination.trim()||null});setSaving(false);if(error){setMessage(error.message);return}setMessage('Payout request submitted for review.');setAmount('');setDestination('');load()}
  const c=wallet?.currency||'ZAR'
  return <main className="page"><div className="eyebrow">CREATOR MONEY</div><h2>Wallet & Payouts</h2><p>Your wallet separates available earnings, pending earnings and completed payouts. Requests remain auditable from submission to payment.</p><div className="wallet-grid"><article><span>Available</span><strong>{money(wallet?.available_balance,c)}</strong></article><article><span>Pending</span><strong>{money(wallet?.pending_balance,c)}</strong></article><article><span>Lifetime paid</span><strong>{money(wallet?.lifetime_paid,c)}</strong></article></div><form className="panel" onSubmit={requestPayout}><h3>Request payout</h3><label>Amount<input type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><label>Destination label<input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="e.g. FNB business account ending 1234"/></label>{message&&<div className="notice">{message}</div>}<button className="primary" disabled={saving}>{saving?'Submitting…':'Request payout'}</button><small>Bank/payment-provider credentials are not stored in this form. A secure payout provider can be connected later.</small></form><div className="release-list payout-list">{payouts.map(p=><article key={p.id}><div><div className="eyebrow">{new Date(p.requested_at).toLocaleDateString()}</div><h3>{money(p.amount,p.currency)}</h3><small>{p.destination_label||'Destination pending'}{p.admin_note?` · ${p.admin_note}`:''}</small></div><span className={`status status-${p.status}`}>{p.status}</span></article>)}</div></main>
}

export function AdminCommercialPage({ session }) {
  const [role,setRole]=useState(null); const [payouts,setPayouts]=useState([]); const [message,setMessage]=useState('')
  async function load(){if(!supabase||!session)return;const {data:profile}=await supabase.from('profiles').select('role').eq('id',session.user.id).maybeSingle();setRole(profile?.role||'creator');if(profile?.role!=='admin')return;const {data}=await supabase.from('payout_requests').select('id,owner_id,currency,amount,status,destination_label,requested_at').order('requested_at',{ascending:false}).limit(100);setPayouts(data||[])}
  useEffect(()=>{load()},[session])
  if(!session)return <Gate/>;if(role&&role!=='admin')return <main className="page"><div className="eyebrow">ADMIN</div><h2>Access restricted</h2><p>This commercial control room is limited to administrators.</p></main>
  async function setStatus(id,status){const {error}=await supabase.from('payout_requests').update({status,processed_at:['paid','rejected'].includes(status)?new Date().toISOString():null}).eq('id',id);if(error){setMessage(error.message);return}setMessage(`Payout marked ${status}.`);load()}
  return <main className="page"><div className="eyebrow">ADMIN COMMERCIAL CONTROL</div><h2>Payout Operations</h2><p>Review and move payout requests through an auditable operating queue.</p>{message&&<div className="notice">{message}</div>}<div className="release-list">{payouts.map(p=><article key={p.id}><div><div className="eyebrow">{p.status}</div><h3>{money(p.amount,p.currency)}</h3><small>{p.owner_id} · {p.destination_label||'No destination label'}</small></div><div className="commercial-actions"><button className="secondary" onClick={()=>setStatus(p.id,'approved')}>Approve</button><button className="secondary" onClick={()=>setStatus(p.id,'processing')}>Processing</button><button className="primary" onClick={()=>setStatus(p.id,'paid')}>Paid</button><button className="text-button danger" onClick={()=>setStatus(p.id,'rejected')}>Reject</button></div></article>)}</div></main>
}

function Gate(){return <main className="page"><div className="eyebrow">CREATOR ACCESS</div><h2>Log in required</h2><p>Please log in to access this area.</p></main>}
