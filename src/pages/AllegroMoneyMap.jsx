import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const money = (value, currency = 'ZAR') => new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(Number(value || 0));

export default function AllegroMoneyMap() {
  const [session, setSession] = useState(null);
  const [claims, setClaims] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      if (!data.session?.user?.id) { setLoading(false); return; }
      const userId = data.session.user.id;
      const [claimsRes, txRes] = await Promise.all([
        supabase.from('allegro_money_map_claims').select('*').eq('creator_id', userId).order('created_at', { ascending: false }),
        supabase.from('allegro_royalty_transactions').select('*').eq('creator_id', userId).order('created_at', { ascending: false })
      ]);
      if (!mounted) return;
      if (claimsRes.error || txRes.error) setError(claimsRes.error?.message || txRes.error?.message || 'Unable to load your royalty data.');
      setClaims(claimsRes.data || []);
      setTransactions(txRes.data || []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const totals = useMemo(() => transactions.reduce((a, t) => {
    a.gross += Number(t.gross_amount || 0); a.fee += Number(t.allegro_fee || 0); a.creator += Number(t.creator_pool || 0); return a;
  }, { gross: 0, fee: 0, creator: 0 }), [transactions]);

  const status = (s) => String(s || 'identified').replaceAll('_', ' ');

  if (loading) return <div className="min-h-screen bg-black text-white p-8">Loading your ALLEGRO Money Map…</div>;
  if (!session) return <div className="min-h-screen bg-black text-white p-8"><h1 className="text-3xl font-bold">ALLEGRO MONEY MAP™</h1><p className="mt-3 text-white/70">Sign in to see money identified, collected and owed to you.</p></div>;

  return <div className="min-h-screen bg-black text-white p-6 md:p-10">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8"><p className="text-xs font-bold tracking-[.3em] text-fuchsia-400">ALLEGRO RIGHTS & ROYALTIES</p><h1 className="mt-2 text-4xl md:text-5xl font-black">MONEY MAP™</h1><p className="mt-3 max-w-2xl text-white/65">Find the money. Track the rights. Collect what belongs to you.</p></div>
      {error && <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      <div className="grid gap-4 md:grid-cols-3">
        {[['Money identified', money(claims.reduce((n,c)=>n+Number(c.estimated_amount||0),0))],['Gross collected', money(totals.gross)],['Your 90% creator pool', money(totals.creator)]].map(([label,value]) => <div key={label} className="rounded-3xl border border-white/10 bg-white/[.05] p-6"><p className="text-sm text-white/55">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}
      </div>
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold">Money we found</h2><p className="text-sm text-white/50">Potential and active claims in your catalogue.</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{claims.length} claims</span></div>
        <div className="mt-5 space-y-3">{claims.length ? claims.map(c => <div key={c.id} className="rounded-2xl border border-white/10 bg-black/30 p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{c.work_title || 'Untitled work'}</p><p className="text-xs text-white/45">{c.source || 'Unknown source'} · {c.territory || 'Global'}{c.recording_identifier ? ` · ${c.recording_identifier}` : ''}</p></div><div className="text-right"><p className="font-bold">{money(c.estimated_amount, c.currency || 'ZAR')}</p><p className="text-xs capitalize text-fuchsia-300">{status(c.status)}</p></div></div></div>) : <p className="py-8 text-center text-white/45">No money claims yet. Upload your catalogue and ALLEGRO will map the opportunities.</p>}</div>
      </div>
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-6"><h2 className="text-2xl font-bold">Collected royalty ledger</h2><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-white/45"><tr><th className="pb-3">Source</th><th className="pb-3">Gross</th><th className="pb-3">ALLEGRO 10%</th><th className="pb-3">Creator 90%</th><th className="pb-3">Status</th></tr></thead><tbody>{transactions.map(t => <tr key={t.id} className="border-t border-white/10"><td className="py-3">{t.source || 'Royalty'}</td><td>{money(t.gross_amount,t.currency||'ZAR')}</td><td>{money(t.allegro_fee,t.currency||'ZAR')}</td><td className="font-semibold">{money(t.creator_pool,t.currency||'ZAR')}</td><td className="capitalize">{status(t.status)}</td></tr>)}</tbody></table>{!transactions.length && <p className="py-8 text-center text-white/45">No collected transactions yet.</p>}</div><p className="mt-5 text-xs text-white/40">ALLEGRO administration fee is fixed at 10% of amounts actually collected. The creator pool is 90%. Copyright ownership remains with the creator.</p></div>
    </div>
  </div>;
}
