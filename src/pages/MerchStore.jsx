import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function money(value,currency='ZAR'){try{return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(Number(value||0))}catch{return currency+' '+Number(value||0).toFixed(2)}}

export default function MerchStore({session}){
  const[items,setItems]=useState([])
  const[message,setMessage]=useState('')
  const[loading,setLoading]=useState(true)

  useEffect(()=>{(async()=>{
    if(!supabase){setLoading(false);return}
    const{data,error}=await supabase.from('merch_products').select('*').eq('active',true).order('created_at',{ascending:false})
    setItems(data||[]);if(error)setMessage(error.message);setLoading(false)
  })()},[])

  async function buy(item){
    if(!session){setMessage('Log in to buy merchandise through ALLEGRO.');return}
    const size=item.sizes?.length?window.prompt('Size: '+item.sizes.join(', '),item.sizes[0])||item.sizes[0]:null
    const colour=item.colours?.length?window.prompt('Colour: '+item.colours.join(', '),item.colours[0])||item.colours[0]:null
    const quantity=Number(window.prompt('Quantity','1')||0)
    if(!quantity)return
    const{data,error}=await supabase.rpc('create_merch_order',{p_product_id:item.id,p_quantity:quantity,p_size:size,p_colour:colour})
    setMessage(error?error.message:'Order '+data+' created. Secure payment handoff is the next step; no payment has been taken yet.')
  }

  return <main className="page">
    <div className="eyebrow">ALLEGRO MERCH</div>
    <h2>Wear the movement. Sell your own.</h2>
    <p>ALLEGRO can sell official platform merchandise directly, while vetted artists can list their own merchandise. Creator merchandise uses the same transparent commercial model: 10% ALLEGRO fee and 90% creator net before shipping/taxes/provider costs.</p>
    <div className="actions"><Link className="primary" to="/marketplace">Musician Marketplace</Link>{!session&&<Link className="secondary" to="/login">Log in to buy or sell</Link>}</div>
    {message&&<div className="notice">{message}</div>}
    {loading?<div className="empty">Loading merchandise…</div>:<section className="release-grid">{items.map(item=><article className="release-card" key={item.id}>
      {item.image_url&&<img src={item.image_url} alt="" style={{width:'100%',aspectRatio:'1',objectFit:'cover',borderRadius:16}}/>}
      <div className="eyebrow">{item.owner_kind==='platform'?'OFFICIAL ALLEGRO MERCH':'CREATOR MERCH'}</div>
      <h3>{item.title}</h3><p>{item.description}</p><strong>{money(item.price,item.currency)}</strong>
      {!!item.sizes?.length&&<small>Sizes: {item.sizes.join(', ')}</small>}
      {!!item.colours?.length&&<small>Colours: {item.colours.join(', ')}</small>}
      <button className="primary" onClick={()=>buy(item)}>Buy through ALLEGRO</button>
    </article>)}
    {!items.length&&<div className="empty">Merchandise catalogue is ready for the first official and creator products.</div>}
    </section>}
  </main>
}
