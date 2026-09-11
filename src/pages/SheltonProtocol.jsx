import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/shelton-protocol.css'

const provinces = [
  'Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo',
  'Mpumalanga','Northern Cape','North West','Western Cape'
]

const sectors = [
  'Music','Film & Television','Radio & Podcasting','Performing Arts','Visual Arts',
  'Fashion & Design','Craft & Heritage','Writing & Publishing','Photography',
  'Gaming & Digital Media','Events & Production','Multi-disciplinary'
]

const stages = [
  ['registered','Registered'],
  ['verified','Verified'],
  ['protocol_ready','Protocol Ready'],
  ['protected','Protected'],
  ['commercial_ready','Commercial Ready'],
  ['investment_ready','Investment Ready'],
]

const moduleCards = [
  { title:'Governance Passport', body:'South African eligibility, identity and entity readiness in one controlled record.', link:'#passport', cta:'Open passport' },
  { title:'IP & Rights', body:'Keep ownership, contributor and rights evidence connected to your catalogue.', link:'/my-music', cta:'Open rights records' },
  { title:'Assets', body:'Create an auditable register for instruments, equipment, wardrobe, production gear and other creative assets.', link:'#assets', cta:'Prepare asset register' },
  { title:'Protection Hub', body:'Record protection needs for future assessment by appropriately licensed insurance partners.', link:'#protection', cta:'View protection pathway' },
  { title:'Earnings', body:'Use Allegro royalties, wallet and booking activity to build a clearer commercial history.', link:'/prosperity', cta:'View earnings' },
  { title:'Commercial Readiness', body:'Connect releases, bookings, contracts and revenue evidence into a stronger business profile.', link:'/bookings', cta:'Open booking desk' },
]

function scorePassport(passport) {
  if (!passport) return 0
  const fields = [
    passport.eligibility_basis,
    passport.province,
    passport.primary_sector,
    passport.declarations?.sa_eligibility_confirmed,
    passport.declarations?.data_assessment_consent,
    passport.declarations?.regulated_partner_acknowledged,
  ]
  return Math.round((fields.filter(Boolean).length / fields.length) * 40)
}

function StageRail({ current }) {
  const currentIndex = Math.max(0, stages.findIndex(([key]) => key === current))
  return <div className="protocol-stage-rail">
    {stages.map(([key,label], index) => (
      <div key={key} className={index <= currentIndex ? 'protocol-stage active' : 'protocol-stage'}>
        <span>{index + 1}</span>
        <strong>{label}</strong>
      </div>
    ))}
  </div>
}

export default function SheltonProtocol({ session }) {
  const [passport,setPassport] = useState(null)
  const [loading,setLoading] = useState(Boolean(session))
  const [saving,setSaving] = useState(false)
  const [message,setMessage] = useState('')
  const [backendReady,setBackendReady] = useState(true)
  const [form,setForm] = useState({
    eligibility_basis:'south_african_citizen',
    province:'Gauteng',
    primary_sector:'Music',
    supporting_entity_name:'',
    public_badge_enabled:false,
    sa_eligibility_confirmed:false,
    data_assessment_consent:false,
    regulated_partner_acknowledged:false,
  })

  useEffect(() => {
    let active = true
    ;(async() => {
      if (!session || !supabase) { setLoading(false); return }
      const { data, error } = await supabase
        .from('shelton_protocol_passports')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle()
      if (!active) return
      if (error && error.code !== 'PGRST116') {
        const notActivated = ['42P01','PGRST205','PGRST204'].includes(error.code)
        if (notActivated) {
          setBackendReady(false)
          setMessage('Protocol enrolment is staged and will activate when the Allegro database migration is applied.')
        } else {
          setMessage('We could not load your Protocol Passport. Please try again from your dashboard.')
        }
      }
      if (data) {
        setPassport(data)
        setForm({
          eligibility_basis:data.eligibility_basis || 'south_african_citizen',
          province:data.province || 'Gauteng',
          primary_sector:data.primary_sector || 'Music',
          supporting_entity_name:data.supporting_entity_name || '',
          public_badge_enabled:Boolean(data.public_badge_enabled),
          sa_eligibility_confirmed:Boolean(data.declarations?.sa_eligibility_confirmed),
          data_assessment_consent:Boolean(data.declarations?.data_assessment_consent),
          regulated_partner_acknowledged:Boolean(data.declarations?.regulated_partner_acknowledged),
        })
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [session])

  const selfScore = useMemo(() => scorePassport(passport || {
    eligibility_basis:form.eligibility_basis,
    province:form.province,
    primary_sector:form.primary_sector,
    declarations:{
      sa_eligibility_confirmed:form.sa_eligibility_confirmed,
      data_assessment_consent:form.data_assessment_consent,
      regulated_partner_acknowledged:form.regulated_partner_acknowledged,
    }
  }), [passport,form])

  async function savePassport(e) {
    e.preventDefault()
    if (!session || !supabase || !backendReady) return
    if (!form.sa_eligibility_confirmed || !form.data_assessment_consent || !form.regulated_partner_acknowledged) {
      setMessage('Complete all three declarations before submitting your Protocol Passport.')
      return
    }
    setSaving(true)
    setMessage('')
    const payload = {
      eligibility_basis:form.eligibility_basis,
      province:form.province,
      primary_sector:form.primary_sector,
      supporting_entity_name:form.supporting_entity_name.trim() || null,
      public_badge_enabled:form.public_badge_enabled,
      declarations:{
        sa_eligibility_confirmed:form.sa_eligibility_confirmed,
        data_assessment_consent:form.data_assessment_consent,
        regulated_partner_acknowledged:form.regulated_partner_acknowledged,
      },
      updated_at:new Date().toISOString(),
    }
    let result
    if (passport) {
      result = await supabase
        .from('shelton_protocol_passports')
        .update(payload)
        .eq('owner_id', session.user.id)
        .select('*')
        .single()
    } else {
      result = await supabase
        .from('shelton_protocol_passports')
        .insert({ owner_id:session.user.id, ...payload })
        .select('*')
        .single()
    }
    setSaving(false)
    if (result.error) {
      const notActivated = ['42P01','PGRST205','PGRST204'].includes(result.error.code)
      if (notActivated) {
        setBackendReady(false)
        setMessage('Protocol enrolment is staged and will activate when the Allegro database migration is applied.')
      } else {
        setMessage('We could not save your Protocol Passport. Please try again from your dashboard.')
      }
      return
    }
    setPassport(result.data)
    setMessage('Protocol Passport saved. Verification remains pending until reviewed.')
  }

  return <main className="protocol-page">
    <section className="protocol-hero">
      <div>
        <div className="eyebrow">ALLEGRO SOUTH AFRICA · POWERED BY THE SHELTON PROTOCOL™</div>
        <h1>Your creative career.<br/><em>Governed. Protected. Bankable.</em></h1>
        <p>The SHELTON PROTOCOL™ layer is reserved for qualifying South African creatives and creative enterprises. It turns your Allegro activity into a structured governance, rights, risk and commercial-readiness journey.</p>
        <div className="actions">
          {session ? <a className="primary" href="#passport">Open my Protocol Passport</a> : <Link className="primary" to="/register">Create Allegro account</Link>}
          <a className="secondary" href="#how-it-works">How it works</a>
        </div>
      </div>
      <div className="protocol-seal">
        <span>SOUTH AFRICA</span>
        <strong>SHELTON<br/>PROTOCOL™</strong>
        <small>CREATIVE ECONOMY GOVERNANCE LAYER</small>
      </div>
    </section>

    <section id="how-it-works" className="protocol-section">
      <div className="protocol-section-heading">
        <div><div className="eyebrow">ONE CREATIVE OPERATING SYSTEM</div><h2>From informal activity to institutional readiness.</h2></div>
        <p>Allegro remains the marketplace and creator platform. The SHELTON PROTOCOL™ becomes the South African governance, protection and economic layer underneath it.</p>
      </div>
      <StageRail current={passport?.protocol_status || 'registered'} />
    </section>

    <section className="protocol-module-grid">
      {moduleCards.map(card => <article key={card.title}>
        <div className="protocol-icon">{card.title.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
        <h3>{card.title}</h3>
        <p>{card.body}</p>
        {card.link.startsWith('#') ? <a href={card.link}>{card.cta}</a> : <Link to={card.link}>{card.cta}</Link>}
      </article>)}
    </section>

    <section id="passport" className="protocol-section protocol-passport-wrap">
      <div className="protocol-passport-copy">
        <div className="eyebrow">MY PROTOCOL PASSPORT</div>
        <h2>South African creative verification starts here.</h2>
        <p>This first layer captures only the minimum information needed to establish eligibility and readiness. Do not upload identity numbers into this form. Formal identity/entity verification will be handled through a controlled verification workflow.</p>
        {passport && <div className="protocol-status-card">
          <div><span>Current status</span><strong>{stages.find(([key]) => key === passport.protocol_status)?.[1] || 'Registered'}</strong></div>
          <div><span>Verification</span><strong>{passport.verification_status || 'pending'}</strong></div>
          <div><span>Self-assessed readiness</span><strong>{selfScore}/40</strong></div>
        </div>}
      </div>

      {!session ? <div className="protocol-signin-card">
        <h3>Sign in to begin</h3>
        <p>Your Protocol Passport belongs to your verified Allegro creator account.</p>
        <div className="actions"><Link className="primary" to="/login">Log in</Link><Link className="secondary" to="/register">Join Allegro</Link></div>
      </div> : loading ? <div className="protocol-signin-card">Loading your Protocol Passport…</div> :
      <form className="protocol-form" onSubmit={savePassport}>
        {!backendReady && <div className="notice">The SHELTON PROTOCOL™ experience is live, but creator enrolment records are not active on this environment yet. Your existing Allegro account, releases and earnings are unaffected.</div>}
        <label>South African eligibility basis
          <select value={form.eligibility_basis} onChange={e=>setForm({...form,eligibility_basis:e.target.value})}>
            <option value="south_african_citizen">South African citizen</option>
            <option value="permanent_resident">South African permanent resident</option>
            <option value="sa_registered_creative_entity">Qualifying South African registered creative entity</option>
          </select>
        </label>
        <label>Province
          <select value={form.province} onChange={e=>setForm({...form,province:e.target.value})}>
            {provinces.map(p=><option key={p}>{p}</option>)}
          </select>
        </label>
        <label>Primary creative sector
          <select value={form.primary_sector} onChange={e=>setForm({...form,primary_sector:e.target.value})}>
            {sectors.map(s=><option key={s}>{s}</option>)}
          </select>
        </label>
        {form.eligibility_basis === 'sa_registered_creative_entity' && <label>South African entity name
          <input value={form.supporting_entity_name} onChange={e=>setForm({...form,supporting_entity_name:e.target.value})} placeholder="Registered entity name" />
        </label>}
        <label className="protocol-check"><input type="checkbox" checked={form.sa_eligibility_confirmed} onChange={e=>setForm({...form,sa_eligibility_confirmed:e.target.checked})}/><span>I confirm that the eligibility basis selected above is true and may be verified.</span></label>
        <label className="protocol-check"><input type="checkbox" checked={form.data_assessment_consent} onChange={e=>setForm({...form,data_assessment_consent:e.target.checked})}/><span>I consent to the use of my Protocol information for governance and readiness assessment within Allegro.</span></label>
        <label className="protocol-check"><input type="checkbox" checked={form.regulated_partner_acknowledged} onChange={e=>setForm({...form,regulated_partner_acknowledged:e.target.checked})}/><span>I understand that insurance, financial advice, underwriting and regulated financial services can only be provided by appropriately authorised partners.</span></label>
        <label className="protocol-check"><input type="checkbox" checked={form.public_badge_enabled} onChange={e=>setForm({...form,public_badge_enabled:e.target.checked})}/><span>Allow Allegro to display my verified SHELTON PROTOCOL™ status publicly once approved. Private documents remain private.</span></label>
        {message && <div className="notice">{message}</div>}
        <button className="primary" disabled={saving || !backendReady}>{saving ? 'Saving…' : backendReady ? (passport ? 'Update Protocol Passport' : 'Create Protocol Passport') : 'Enrolment activation pending'}</button>
      </form>}
    </section>

    <section id="assets" className="protocol-section protocol-split">
      <article><div className="eyebrow">ASSET REGISTER</div><h3>Know what must be protected.</h3><p>Instruments, cameras, sound equipment, laptops, wardrobe, stage gear and production assets can be structured into a future auditable register instead of living in scattered spreadsheets and receipts.</p></article>
      <article id="protection"><div className="eyebrow">PROTECTION HUB</div><h3>Insurance becomes a pathway, not a promise.</h3><p>Allegro can capture protection needs and risk information. Any quotation, advice, policy placement, underwriting or claims decision must remain with appropriately licensed insurance/FSP partners.</p></article>
    </section>

    <section className="protocol-foundation">
      <div><div className="eyebrow">THE OPERATING MODEL</div><h2>ALLEGRO is the marketplace.<br/>SHELTON PROTOCOL™ is the governance engine.</h2></div>
      <div className="protocol-equation">
        <span>Verified creator identity</span><b>+</b><span>Rights & commercial activity</span><b>+</b><span>Governance & protection readiness</span><b>=</b><strong>South African creative economy infrastructure</strong>
      </div>
    </section>
  </main>
}
