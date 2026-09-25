import { useEffect,useMemo,useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, backendProvider } from '../lib/supabaseClient'
import MovementSizzle from '../components/MovementSizzle'
import '../styles/movement-sizzle.css'
import '../styles/merch-store.css'

const TEE_SIZES=['XS','S','M','L','XL','2XL','3XL','4XL','5XL']
const PREORDER_CAMPAIGN={code:'AV-DROP-01',name:'ALLEGRO-VIBEZ DROP 01',target:100000,currency:'ZAR'}
const MERCH_CHECKOUT_ENDPOINT='https://yfawrenhudjomhnglfhq.supabase.co/functions/v1/allegro-asset-upload'
const officialTees=[
  {id:'movement-black',sku:'AV-TEE-MOV-BLK',name:'The Movement Oversized Tee',colour:'Black',price:549,tone:'black',tag:'MORE THAN MUSIC. A MOVEMENT.'},
  {id:'african-born-cream',sku:'AV-TEE-AFR-CRM',name:'African-Born Oversized Tee',colour:'Cream',price:599,tone:'cream',tag:'AFRICAN-BORN. GLOBAL SOUND.'},
  {id:'creators-burgundy',sku:'AV-TEE-CCS-BRG',name:'Creators. Culture. Sound. Tee',colour:'Burgundy',price:599,tone:'burgundy',tag:'CREATORS. CULTURE. SOUND.'},
  {id:'creator-economy-white',sku:'AV-TEE-ECO-WHT',name:'Creator Economy Oversized Tee',colour:'White',price:549,tone:'white',tag:'ARTISTS · RADIO · CULTURE · LIVE'}
]
const dropCategories=[
  {name:'Oversized Tees',anchor:'#tees',note:'Heavyweight 300gsm statement tees.'},
  {name:'Golf Shirts',anchor:'#golf',note:'Premium polos with clean ALLEGRO-VIBEZ detailing.'},
  {name:'Hoodies',anchor:'#outerwear',note:'Heavyweight streetwear layers.'},
  {name:'Jackets',anchor:'#outerwear',note:'Varsity and statement outerwear.'},
  {name:'Bucket Hats & Caps',anchor:'#outerwear',note:'Headwear for stage, street and everyday wear.'}
]
const PREVIEW_CATEGORIES=['All','Hoodies','Jackets','Caps','Bucket Hats','Accessories']
const PREVIEW_POSITIONS={
  Hoodies:'16% 42%',
  Jackets:'43% 40%',
  Caps:'75% 30%',
  'Bucket Hats':'83% 66%',
  Accessories:'54% 76%'
}
const comingProducts=[
  {id:'movement-hoodie-black',category:'Hoodies',name:'The Movement Hoodie',colour:'Black',tone:'black',tag:'MORE THAN MUSIC. A MOVEMENT.',note:'Official ALLEGRO-VIBEZ statement hoodie.'},
  {id:'african-born-hoodie-cream',category:'Hoodies',name:'African-Born Hoodie',colour:'Cream',tone:'cream',tag:'AFRICAN-BORN. GLOBAL SOUND.',note:'Signature cream creator-culture hoodie.'},
  {id:'creators-hoodie-burgundy',category:'Hoodies',name:'Creators. Culture. Sound. Hoodie',colour:'Burgundy',tone:'burgundy',tag:'CREATORS. CULTURE. SOUND.',note:'Deep burgundy ALLEGRO creator edition.'},
  {id:'varsity-jacket-black',category:'Jackets',name:'ALLEGRO Varsity Jacket',colour:'Black / Cream',tone:'black',tag:'ALLEGRO VIBEZ',note:'Premium varsity direction for artists, crews and events.'},
  {id:'tour-jacket-burgundy',category:'Jackets',name:'Creators Tour Jacket',colour:'Burgundy / Black',tone:'burgundy',tag:'WORLDWIDE FOR CREATORS',note:'Statement outerwear for stage, travel and culture.'},
  {id:'bomber-jacket-black',category:'Jackets',name:'ALLEGRO Creator Bomber',colour:'Black',tone:'black',tag:'ARTISTS · RADIO · CULTURE · LIVE',note:'Clean creator-focused bomber concept.'},
  {id:'classic-cap-black',category:'Caps',name:'ALLEGRO Classic Cap',colour:'Black',tone:'black',tag:'ALLEGRO VIBEZ',note:'Minimal embroidered-logo cap direction.'},
  {id:'signature-cap-cream',category:'Caps',name:'African-Born Signature Cap',colour:'Cream',tone:'cream',tag:'AFRICAN-BORN',note:'Cream statement cap for the signature collection.'},
  {id:'creator-cap-burgundy',category:'Caps',name:'Creator Culture Cap',colour:'Burgundy',tone:'burgundy',tag:'CREATORS. CULTURE. SOUND.',note:'Burgundy creator-edition headwear.'},
  {id:'movement-bucket-black',category:'Bucket Hats',name:'The Movement Bucket Hat',colour:'Black',tone:'black',tag:'MORE THAN MUSIC.',note:'Black ALLEGRO bucket hat for street and festival wear.'},
  {id:'african-born-bucket-cream',category:'Bucket Hats',name:'African-Born Bucket Hat',colour:'Cream',tone:'cream',tag:'GLOBAL SOUND.',note:'Cream bucket-hat direction from the signature drop.'},
  {id:'creator-beanie',category:'Accessories',name:'ALLEGRO Creator Beanie',colour:'Black',tone:'black',tag:'ALLEGRO',note:'Cold-weather creator accessory with restrained branding.'},
  {id:'creator-tote',category:'Accessories',name:'ALLEGRO Creator Tote',colour:'Black / Natural',tone:'cream',tag:'CARRY THE MOVEMENT.',note:'Everyday creator tote for gear, records and essentials.'},
  {id:'studio-duffel',category:'Accessories',name:'ALLEGRO Studio Duffel',colour:'Black',tone:'black',tag:'CREATE. MOVE. REPEAT.',note:'Travel and studio bag concept for the creator ecosystem.'}
]

function money(value,currency='ZAR'){
  try{return new Intl.NumberFormat('en-ZA',{style:'currency',currency,maximumFractionDigits:0}).format(Number(value||0))}
  catch{return currency+' '+Number(value||0).toFixed(0)}
}

export default function MerchStore({session}){
  const[creatorItems,setCreatorItems]=useState([])
  const[message,setMessage]=useState('')
  const[loading,setLoading]=useState(true)
  const[selected,setSelected]=useState(null)
  const[selectedSize,setSelectedSize]=useState('L')
  const[quantity,setQuantity]=useState(1)
  const[checkoutBusy,setCheckoutBusy]=useState(false)
  const[checkoutHealth,setCheckoutHealth]=useState({loading:true,configured:false,live:false,mode:'unknown'})
  const[delivery,setDelivery]=useState({customer_name:'',mobile:'',delivery_address:'',delivery_city:'',delivery_province:'',delivery_postal_code:''})
  const[selectedMerchCategory,setSelectedMerchCategory]=useState('All')
  const[previewItem,setPreviewItem]=useState(null)
  const[vettingStatus,setVettingStatus]=useState(null)
  const[myMerch,setMyMerch]=useState([])
  const[creatorForm,setCreatorForm]=useState({title:'',description:'',product_type:'tshirt',price:'',image_url:'',sizes:'',colours:'',stock_quantity:'',made_to_order:false})
  const[savingMerch,setSavingMerch]=useState(false)
  const[campaignProgress,setCampaignProgress]=useState({paid_sales:0,payment_count:0,units:0,status:'preparing'})

  useEffect(()=>{(async()=>{
    if(!supabase){setLoading(false);return}
    const{data,error}=await supabase.from('merch_products').select('*').eq('active',true).eq('owner_kind','creator').order('created_at',{ascending:false})
    if(!error)setCreatorItems(data||[])
    setLoading(false)
  })()},[])

  useEffect(()=>{(async()=>{
    if(!supabase)return
    const{data,error}=await supabase.rpc('get_merch_campaign_progress',{p_campaign_code:PREORDER_CAMPAIGN.code})
    if(error||!data)return
    setCampaignProgress({
      paid_sales:Number(data.paid_sales||0),
      payment_count:Number(data.payment_count||0),
      units:Number(data.units||0),
      status:data.status||'preparing'
    })
  })()},[])

  useEffect(()=>{(async()=>{
    try{
      const response=await fetch(MERCH_CHECKOUT_ENDPOINT+'?mode=merch-checkout-health',{cache:'no-store',headers:{Accept:'application/json'}})
      const data=await response.json().catch(()=>({}))
      setCheckoutHealth({
        loading:false,
        configured:response.ok&&Boolean(data.configured),
        live:response.ok&&Boolean(data.live),
        mode:String(data.mode||'unknown')
      })
    }catch{
      setCheckoutHealth({loading:false,configured:false,live:false,mode:'unavailable'})
    }
  })()},[])

  useEffect(()=>{
    if(!session?.user)return
    const meta=session.user.user_metadata||{}
    const customerName=meta.full_name||meta.name||''
    if(customerName)setDelivery(current=>current.customer_name?current:{...current,customer_name:customerName})
  },[session?.user?.id])

  useEffect(()=>{(async()=>{
    if(!supabase||!session?.user?.id){setVettingStatus(null);setMyMerch([]);return}
    const[{data:vetting},{data:mine}]=await Promise.all([
      supabase.from('musician_vetting').select('status,verification_level,reviewed_at,expires_at').eq('user_id',session.user.id).maybeSingle(),
      supabase.from('merch_products').select('*').eq('seller_id',session.user.id).order('created_at',{ascending:false})
    ])
    setVettingStatus(vetting?.status||'not_started')
    setMyMerch(mine||[])
  })()},[session?.user?.id])

  const launchPrice=useMemo(()=>Math.min(...officialTees.map(item=>item.price)),[])
  const paidSales=Math.max(0,Number(campaignProgress.paid_sales||0))
  const salesRemaining=Math.max(0,PREORDER_CAMPAIGN.target-paidSales)
  const salesPercent=Math.min(100,(paidSales/PREORDER_CAMPAIGN.target)*100)
  const filteredComingProducts=useMemo(()=>selectedMerchCategory==='All'?comingProducts:comingProducts.filter(item=>item.category===selectedMerchCategory),[selectedMerchCategory])

  function orderOfficial(item){
    setSelected(item)
    setSelectedSize('L')
    setQuantity(1)
    setMessage('')
    window.setTimeout(()=>document.getElementById('merch-order-panel')?.scrollIntoView({behavior:'smooth',block:'center'}),50)
  }

  function updateDelivery(field,value){
    setDelivery(current=>({...current,[field]:value}))
  }

  async function continueOfficialCheckout(){
    if(!selected)return
    if(!session?.access_token){setMessage('Log in before continuing to secure checkout.');return}
    if(!checkoutHealth.live){
      setMessage(checkoutHealth.mode==='test'
        ?'Secure iKhokha checkout is prepared, but the gateway is still in test mode. No payment has been taken.'
        :'Secure iKhokha checkout is not live yet. No payment has been taken.')
      return
    }
    const required=['customer_name','mobile','delivery_address','delivery_city','delivery_province','delivery_postal_code']
    if(required.some(field=>!String(delivery[field]||'').trim())){
      setMessage('Complete your name, mobile number and delivery address before secure checkout.')
      return
    }
    setCheckoutBusy(true)
    setMessage('Creating your ALLEGRO order and secure iKhokha checkout…')
    try{
      const params=new URLSearchParams(window.location.search)
      const response=await fetch(MERCH_CHECKOUT_ENDPOINT+'?mode=merch-checkout',{
        method:'POST',
        headers:{
          Authorization:'Bearer '+session.access_token,
          'Content-Type':'application/json',
          Accept:'application/json'
        },
        body:JSON.stringify({
          product_id:selected.id,
          size:selectedSize,
          quantity,
          ...delivery,
          utm_source:params.get('utm_source')||'allegro',
          utm_medium:params.get('utm_medium')||'merch-checkout',
          utm_campaign:params.get('utm_campaign')||'wear-the-movement'
        })
      })
      const data=await response.json().catch(()=>({}))
      if(!response.ok){
        if(data.error==='payment_gateway_not_live'){
          setCheckoutHealth(current=>({...current,live:false,mode:data.mode||current.mode}))
          setMessage('Secure iKhokha checkout is prepared, but the gateway is not in live mode. No payment has been taken.')
        }else if(data.error==='authentication_required'){
          setMessage('Your login session needs to be refreshed before checkout. Please log in again.')
        }else if(data.error==='delivery_details_required'){
          setMessage('Complete all delivery details before checkout.')
        }else{
          setMessage('Secure checkout could not be started. No payment has been taken.')
        }
        return
      }
      let checkoutUrl=null
      try{
        const parsed=new URL(data.checkout_url)
        if(parsed.protocol==='https:')checkoutUrl=parsed.toString()
      }catch{}
      if(!checkoutUrl){
        setMessage('The payment provider did not return a valid secure checkout URL. No payment has been taken.')
        return
      }
      setMessage('Order '+data.order_ref+' created. Redirecting to secure iKhokha checkout…')
      window.location.assign(checkoutUrl)
    }catch{
      setMessage('Secure checkout is temporarily unavailable. No payment has been taken.')
    }finally{
      setCheckoutBusy(false)
    }
  }

  function updateCreatorForm(field,value){
    setCreatorForm(current=>({...current,[field]:value}))
  }

  async function submitCreatorMerch(event){
    event.preventDefault()
    if(!supabase||!session?.user?.id){setMessage('Log in before creating a creator merch listing.');return}
    if(vettingStatus!=='approved'){setMessage('Creator merchandise requires approved ALLEGRO marketplace vetting before publication.');return}
    const price=Number(creatorForm.price)
    if(!creatorForm.title.trim()||!Number.isFinite(price)||price<0){setMessage('Add a product name and valid selling price.');return}
    setSavingMerch(true)
    setMessage('')
    const sizes=creatorForm.sizes.split(',').map(v=>v.trim()).filter(Boolean)
    const colours=creatorForm.colours.split(',').map(v=>v.trim()).filter(Boolean)
    const stock=creatorForm.stock_quantity===''?null:Number(creatorForm.stock_quantity)
    const payload={
      seller_id:session.user.id,
      owner_kind:'creator',
      title:creatorForm.title.trim(),
      description:creatorForm.description.trim(),
      product_type:creatorForm.product_type,
      price,
      currency:'ZAR',
      image_url:creatorForm.image_url.trim()||null,
      sizes,
      colours,
      stock_quantity:Number.isFinite(stock)?stock:null,
      made_to_order:Boolean(creatorForm.made_to_order),
      active:true
    }
    const result=backendProvider==='izakhono-core'
      ?await supabase.rpc('create_creator_merch_product',payload)
      :await supabase.from('merch_products').insert(payload).select().single()
    const{data,error}=result
    setSavingMerch(false)
    if(error){setMessage(error.message);return}
    setMyMerch(current=>[data,...current])
    setCreatorItems(current=>[data,...current.filter(item=>item.id!==data.id)])
    setCreatorForm({title:'',description:'',product_type:'tshirt',price:'',image_url:'',sizes:'',colours:'',stock_quantity:'',made_to_order:false})
    setMessage('Your creator merchandise is now listed inside ALLEGRO.')
  }

  async function shareDrop(){
    const shareData={title:PREORDER_CAMPAIGN.name,text:'Limited ALLEGRO-VIBEZ made-to-order merch. Help take DROP 01 to R100,000 in verified paid sales.',url:window.location.href}
    try{
      if(navigator.share){await navigator.share(shareData);return}
      await navigator.clipboard.writeText(window.location.href)
      setMessage('Drop link copied. Share it with your people.')
    }catch(error){
      if(error?.name!=='AbortError')setMessage('Copy this page link to share the drop.')
    }
  }

  async function buyCreator(item){
    if(!session){setMessage('Log in to buy creator merchandise through ALLEGRO.');return}
    const size=item.sizes?.length?window.prompt('Size: '+item.sizes.join(', '),item.sizes[0])||item.sizes[0]:null
    const colour=item.colours?.length?window.prompt('Colour: '+item.colours.join(', '),item.colours[0])||item.colours[0]:null
    const quantity=Number(window.prompt('Quantity','1')||0)
    if(!quantity)return
    const{data,error}=await supabase.rpc('create_merch_order',{p_product_id:item.id,p_quantity:quantity,p_size:size,p_colour:colour})
    setMessage(error?error.message:'Order '+data+' created. Secure payment handoff is the next step; no payment has been taken yet.')
  }

  return <main className="page merch-page">
    <section className="merch-hero">
      <img src="/merch/merch-hero.jpg" alt="ALLEGRO-VIBEZ official 300gsm oversized tee collection"/>
      <div className="merch-hero-copy">
        <div className="eyebrow">DROP 01 · LIMITED PRE-ORDER · ZERO DEAD STOCK</div>
        <h2>Wear the movement.</h2>
        <p>Made to order from verified paid demand. No warehouse gamble, no mass stock — we manufacture what the movement actually buys.</p>
        <div className="merch-specs"><span>300gsm tees</span><span>Oversized fit</span><span>Dropped shoulders</span><span>Original ALLEGRO design</span></div>
        <div className="merch-hero-actions"><a className="primary" href="#tees">Pre-order DROP 01</a><button className="merch-text-button" onClick={shareDrop}>Share the drop</button><a className="merch-text-link" href="#lookbook">View lookbook</a></div>
        <strong>Pre-order tees from {money(launchPrice)} · Sales target {money(PREORDER_CAMPAIGN.target)}</strong>
      </div>
    </section>

    <MovementSizzle launchPrice={launchPrice}/>

    <section className="preorder-target" aria-label="ALLEGRO-VIBEZ DROP 01 sales target">
      <div className="preorder-target-copy">
        <div className="eyebrow">CEO LAUNCH TARGET · VERIFIED PAID SALES ONLY</div>
        <h3>{money(PREORDER_CAMPAIGN.target)} before we scale production.</h3>
        <p>Every confirmed payment moves the counter. Production is made against paid demand; customer fulfilment money stays protected before growth spend.</p>
        <div className="preorder-target-stats">
          <div><span>Paid sales</span><strong>{money(paidSales)}</strong></div>
          <div><span>Remaining</span><strong>{money(salesRemaining)}</strong></div>
          <div><span>Verified payments</span><strong>{campaignProgress.payment_count}</strong></div>
          <div><span>Units sold</span><strong>{campaignProgress.units}</strong></div>
        </div>
      </div>
      <div className="preorder-meter-wrap">
        <div className="preorder-meter-label"><span>DROP 01 progress</span><strong>{salesPercent.toFixed(1)}%</strong></div>
        <div className="preorder-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(salesPercent)}><span style={{width:salesPercent+'%'}}/></div>
        <small>Status: {campaignProgress.status==='open'?'Pre-orders open':'Preparing verified checkout'} · Counter excludes unpaid carts and unverified transfers.</small>
        <button className="secondary" onClick={shareDrop}>Share DROP 01</button>
      </div>
    </section>

    <nav className="merch-categories" aria-label="Merchandise categories">
      <a href="#lookbook">2026 Lookbook</a><a href="#tees">T-Shirts</a><a href="#outerwear">Hoodies</a><a href="#outerwear">Jackets</a><a href="#outerwear">Caps & Hats</a><a href="#creator-merch">Creator Merch</a>
    </nav>

    <section id="lookbook" className="merch-section">
      <div className="merch-heading"><div><div className="eyebrow">ALLEGRO-VIBEZ 2026 LOOKBOOK</div><h3>Designed like fashion. Worn like identity.</h3></div><p>Oversized tees · golf shirts · hoodies · jackets · bucket hats · caps</p></div>
      <img className="outerwear-lookbook allegro-lookbook" src="/allegro-vibez-merch-lookbook.webp" alt="ALLEGRO-VIBEZ fashion lookbook with oversized T-shirts, golf shirts, hoodies, jackets, bucket hats and caps"/>
    </section>

    <section className="merch-drop-nav" aria-label="Shop the ALLEGRO-VIBEZ drop">
      {dropCategories.map((item,index)=><a key={item.name} href={item.anchor}>
        <small>{String(index+1).padStart(2,'0')}</small>
        <strong>{item.name}</strong>
        <span>{item.note}</span>
      </a>)}
    </section>

    <section id="golf" className="merch-section merch-golf-preview">
      <div className="merch-heading"><div><div className="eyebrow">PREMIUM GOLF SHIRTS</div><h3>Clean enough for business. Loud enough for ALLEGRO.</h3></div><p>Design preview only · final garment specification and selling price will be published once approved.</p></div>
      <div className="golf-preview-card">
        <img src="/allegro-vibez-merch-lookbook.webp" alt="ALLEGRO-VIBEZ golf shirt concept in the 2026 lookbook"/>
        <div><span>ALLEGRO-VIBEZ 2026</span><h4>Golf Shirt Collection</h4><p>Premium black, cream and statement-accent direction with restrained branding for events, creators and corporate wear.</p><button className="secondary" onClick={()=>setMessage('ALLEGRO-VIBEZ golf shirts are in the 2026 merch range. Final price and garment specification will be published once approved.')}>Register interest</button></div>
      </div>
    </section>

    <section id="tees" className="merch-section">
      <div className="merch-heading"><div><div className="eyebrow">DROP 01 · MADE TO ORDER · CONFIRMED 300GSM</div><h3>Signature Oversized Tees</h3></div><p>Heavyweight construction · oversized unisex fit · XS to 5XL</p></div>
      <div className="merch-product-grid">
        {officialTees.map(item=><article className={"official-product tone-"+item.tone} key={item.id}>
          <div className="tee-mockup" aria-label={item.name+' product mockup'}>
            <div className="tee-sleeve tee-sleeve-left"/><div className="tee-sleeve tee-sleeve-right"/>
            <div className="tee-body">
              <small>ALLEGRO-VIBEZ</small>
              <strong>{item.tag}</strong>
              <span>300GSM · OVERSIZED</span>
            </div>
          </div>
          <div className="product-copy"><div><span>{item.colour} · {item.sku}</span><h4>{item.name}</h4></div><strong className="merch-price">{money(item.price)}</strong></div>
          <p>Confirmed 300gsm heavyweight tee with premium oversized silhouette and dropped shoulders. Produced against verified paid pre-orders.</p>
          <div className="size-row">{TEE_SIZES.map(size=><span key={size}>{size}</span>)}</div>
          <button className="primary" onClick={()=>orderOfficial(item)}>Pre-order · choose size</button>
        </article>)}
      </div>
    </section>

    <section id="outerwear" className="merch-section">
      <div className="merch-heading"><div><div className="eyebrow">THE NEXT DROP · OFFICIAL RANGE PREVIEW</div><h3>Hoodies, jackets, caps, bucket hats & accessories</h3></div><p>Preview the wider collection now. Final product details and pricing will follow as each piece is approved.</p></div>
      <img className="outerwear-lookbook" src="/merch/outerwear-hats.jpg" alt="ALLEGRO-VIBEZ hoodie, jacket, caps, bucket hats and accessories"/>
      <div className="merch-filter-row" role="group" aria-label="Filter ALLEGRO-VIBEZ collection previews">
        {PREVIEW_CATEGORIES.map(category=><button key={category} className={selectedMerchCategory===category?'active':''} onClick={()=>setSelectedMerchCategory(category)}>{category}</button>)}
      </div>
      <div className="coming-merch-grid">
        {filteredComingProducts.map(item=><article className={"coming-product tone-"+item.tone} key={item.id}>
          <div className="coming-product-art coming-product-photo" style={{'--preview-position':PREVIEW_POSITIONS[item.category]||'center'}}>
            <span>{item.category}</span>
            <strong>{item.tag}</strong>
            <small>ALLEGRO-VIBEZ</small>
          </div>
          <div className="product-copy"><div><span>{item.colour}</span><h4>{item.name}</h4></div><strong className="merch-tba">COMING SOON</strong></div>
          <p>{item.note}</p>
          <div className="merch-preview-labels"><span>Official merch</span><span>Collection preview</span><span>Details to follow</span></div>
          <button className="secondary" onClick={()=>{setPreviewItem(item);window.setTimeout(()=>document.getElementById('collection-preview')?.scrollIntoView({behavior:'smooth',block:'center'}),50)}}>View piece</button>
        </article>)}
      </div>
    </section>

    {previewItem&&<section id="collection-preview" className={"merch-piece-preview tone-"+previewItem.tone}>
      <div className="merch-piece-visual" style={{'--preview-position':PREVIEW_POSITIONS[previewItem.category]||'center'}}>
        <div><span>{previewItem.category}</span><strong>{previewItem.tag}</strong><small>ALLEGRO-VIBEZ ATELIER</small></div>
      </div>
      <div className="merch-piece-copy">
        <div className="eyebrow">OFFICIAL COLLECTION PREVIEW</div>
        <h3>{previewItem.name}</h3>
        <p className="merch-piece-colour">{previewItem.colour}</p>
        <p>{previewItem.note} The final selling price and garment specification will only be published after the production piece is approved.</p>
        <div className="merch-piece-status"><span>Design direction approved</span><span>Price to follow</span><span>Specification to follow</span></div>
        <div className="merch-piece-actions"><button className="primary" onClick={()=>setPreviewItem(null)}>Back to collection</button><a className="secondary" href="#lookbook">View lookbook</a></div>
      </div>
    </section>}

    {selected&&<section id="merch-order-panel" className="panel merch-order-panel">
      <div>
        <div className="eyebrow">DROP 01 PRE-ORDER</div>
        <h3>{selected.name}</h3>
        <p>{selected.colour} · 300gsm · Oversized fit · SKU {selected.sku}</p>
        <strong className="merch-price">{money(selected.price*quantity)}</strong>
        <small className="order-summary">{quantity} × {money(selected.price)} · Size {selectedSize}</small>
      </div>
      <div className="official-checkout-form">
        <div className="official-order-options">
          <label>Size<select value={selectedSize} onChange={e=>setSelectedSize(e.target.value)}>{TEE_SIZES.map(size=><option key={size}>{size}</option>)}</select></label>
          <label>Quantity<select value={quantity} onChange={e=>setQuantity(Number(e.target.value))}><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
        </div>
        {session&&<div className="delivery-fields">
          <label>Full name<input value={delivery.customer_name} onChange={e=>updateDelivery('customer_name',e.target.value)} autoComplete="name" placeholder="Name for the order"/></label>
          <label>Mobile number<input value={delivery.mobile} onChange={e=>updateDelivery('mobile',e.target.value)} autoComplete="tel" inputMode="tel" placeholder="Contact number"/></label>
          <label className="delivery-wide">Delivery address<input value={delivery.delivery_address} onChange={e=>updateDelivery('delivery_address',e.target.value)} autoComplete="street-address" placeholder="Street address"/></label>
          <label>City / town<input value={delivery.delivery_city} onChange={e=>updateDelivery('delivery_city',e.target.value)} autoComplete="address-level2" placeholder="City or town"/></label>
          <label>Province<input value={delivery.delivery_province} onChange={e=>updateDelivery('delivery_province',e.target.value)} autoComplete="address-level1" placeholder="Province"/></label>
          <label>Postal code<input value={delivery.delivery_postal_code} onChange={e=>updateDelivery('delivery_postal_code',e.target.value)} autoComplete="postal-code" inputMode="numeric" placeholder="Postal code"/></label>
        </div>}
        {!session?<Link className="primary" to="/login">Log in to continue</Link>:<button className="primary" disabled={checkoutBusy||checkoutHealth.loading||!checkoutHealth.live} onClick={continueOfficialCheckout}>{checkoutBusy?'Preparing secure checkout…':checkoutHealth.live?'Continue to secure iKhokha checkout':checkoutHealth.loading?'Checking payment gateway…':'Secure checkout preparing'}</button>}
        <div className={"checkout-readiness "+(checkoutHealth.live?'is-live':'is-preparing')}>
          <strong>{checkoutHealth.live?'Secure checkout ready':'Payment protection active'}</strong>
          <span>{checkoutHealth.live?'Server-priced order + verified iKhokha handoff.':checkoutHealth.mode==='test'?'iKhokha API is currently in test mode, so ALLEGRO will not take payment.':'Checkout remains blocked until the verified gateway is live.'}</span>
        </div>
        <small className="checkout-note">Your production slot is reserved only after a signed successful payment confirmation. Garment price excludes courier/delivery; delivery is arranged and quoted separately before dispatch. ALLEGRO records your size, quantity and delivery details before creating any payment link.</small>
      </div>
    </section>}

    {message&&<div className="notice">{message}</div>}

    <section className="merch-trust">
      <div><strong>Official ALLEGRO-VIBEZ</strong><span>Original platform merchandise</span></div>
      <div><strong>Made to order</strong><span>No speculative stock; production follows paid demand</span></div>
      <div><strong>Secure checkout</strong><span>Payment only through a verified gateway</span></div>
      <div><strong>Creator economy</strong><span>Creator merch supports the 10% marketplace model</span></div>
    </section>

    <section id="creator-studio" className="merch-section creator-merch-studio">
      <div className="merch-heading"><div><div className="eyebrow">CREATOR MERCH STUDIO</div><h3>Turn your artist identity into a store.</h3></div><p>Approved creators can publish merchandise directly into the ALLEGRO marketplace. Creator sales retain the fixed 10% ALLEGRO platform share recorded in the marketplace order ledger.</p></div>
      {!session?<div className="creator-studio-gate"><div><span>ARTIST ACCESS</span><h4>Log in to open your merch studio.</h4><p>Your artist identity and marketplace vetting stay attached to every listing.</p></div><Link className="primary" to="/login">Log in</Link></div>:
      vettingStatus!=='approved'?<div className="creator-studio-gate"><div><span>VETTING REQUIRED</span><h4>{vettingStatus==='not_started'?'Complete marketplace vetting first.':'Marketplace vetting: '+String(vettingStatus).replace('_',' ')}</h4><p>Only approved creators can publish products or transact through creator commerce. This protects buyers, artists and the ALLEGRO marketplace.</p></div><Link className="primary" to="/marketplace">Open marketplace vetting</Link></div>:
      <div className="creator-studio-layout">
        <form className="creator-merch-form" onSubmit={submitCreatorMerch}>
          <div className="creator-studio-status"><span>APPROVED CREATOR</span><strong>Publish a product</strong></div>
          <label>Product name<input value={creatorForm.title} onChange={e=>updateCreatorForm('title',e.target.value)} maxLength="160" required placeholder="e.g. Tour Hoodie"/></label>
          <div className="creator-form-row">
            <label>Product type<select value={creatorForm.product_type} onChange={e=>updateCreatorForm('product_type',e.target.value)}><option value="tshirt">T-shirt</option><option value="hoodie">Hoodie</option><option value="cap">Cap</option><option value="jacket">Jacket</option><option value="poster">Poster</option><option value="vinyl">Vinyl</option><option value="cd">CD</option><option value="accessory">Accessory</option><option value="bundle">Bundle</option><option value="other">Other</option></select></label>
            <label>Price (ZAR)<input type="number" min="0" step="0.01" value={creatorForm.price} onChange={e=>updateCreatorForm('price',e.target.value)} required placeholder="0.00"/></label>
          </div>
          <label>Description<textarea value={creatorForm.description} onChange={e=>updateCreatorForm('description',e.target.value)} rows="4" placeholder="Describe the piece, drop or artist story."/></label>
          <label>Product image URL<input type="url" value={creatorForm.image_url} onChange={e=>updateCreatorForm('image_url',e.target.value)} placeholder="https://..."/></label>
          <div className="creator-form-row">
            <label>Sizes <small>comma separated</small><input value={creatorForm.sizes} onChange={e=>updateCreatorForm('sizes',e.target.value)} placeholder="S, M, L, XL"/></label>
            <label>Colours <small>comma separated</small><input value={creatorForm.colours} onChange={e=>updateCreatorForm('colours',e.target.value)} placeholder="Black, Cream"/></label>
          </div>
          <div className="creator-form-row creator-form-stock">
            <label>Stock quantity <small>leave empty if not tracked</small><input type="number" min="0" value={creatorForm.stock_quantity} onChange={e=>updateCreatorForm('stock_quantity',e.target.value)} placeholder="Optional"/></label>
            <label className="creator-checkbox"><input type="checkbox" checked={creatorForm.made_to_order} onChange={e=>updateCreatorForm('made_to_order',e.target.checked)}/><span>Made to order</span></label>
          </div>
          <div className="creator-fee-preview"><span>CREATOR COMMERCE</span><strong>90% creator · 10% ALLEGRO</strong><small>Before shipping, tax and any verified payment-provider costs.</small></div>
          <button className="primary" disabled={savingMerch}>{savingMerch?'Publishing…':'Publish to ALLEGRO'}</button>
        </form>
        <aside className="creator-studio-sidebar">
          <span>YOUR MERCH</span>
          <h4>{myMerch.length} product{myMerch.length===1?'':'s'}</h4>
          <p>Products are tied to your authenticated creator account. Keep imagery accurate and only list merchandise you are authorised to sell.</p>
          <div className="creator-studio-mini-list">{myMerch.slice(0,5).map(item=><div key={item.id}><strong>{item.title}</strong><span>{money(item.price,item.currency)} · {item.active?'Live':'Hidden'}</span></div>)}{!myMerch.length&&<small>No creator products published yet.</small>}</div>
        </aside>
      </div>}
    </section>

    <section id="creator-merch" className="merch-section">
      <div className="merch-heading"><div><div className="eyebrow">CREATOR MERCH</div><h3>Artist storefronts inside ALLEGRO</h3></div><Link to="/marketplace">Open Musician Marketplace</Link></div>
      <p>Vetted creators can list their own merchandise. Creator sales use the internal marketplace structure so ALLEGRO's platform fee and the creator net are recorded transparently.</p>
      {loading?<div className="empty">Loading creator merchandise…</div>:<div className="merch-product-grid creator-merch-grid">
        {creatorItems.map(item=><article className="official-product" key={item.id}>
          {item.image_url&&<img className="creator-merch-image" src={item.image_url} alt={item.title}/>}
          <div className="product-copy"><div><span>CREATOR MERCH</span><h4>{item.title}</h4></div><strong className="merch-price">{money(item.price,item.currency)}</strong></div>
          <p>{item.description}</p>
          <button className="primary" onClick={()=>buyCreator(item)}>Buy through ALLEGRO</button>
        </article>)}
        {!creatorItems.length&&<div className="empty">The creator merch marketplace is ready for its first vetted artist stores.</div>}
      </div>}
    </section>

    <section className="panel founders-drop"><div><div className="eyebrow">DROP 01 · R100K SALES MISSION</div><h3>ALLEGRO Founders Pre-Order</h3><p>We are building the first production run from paid demand, not borrowed inventory. Once fulfilment obligations are ring-fenced, the remaining margin funds the next drop, artist collaborations and growth.</p></div><div className="founders-drop-actions"><a className="primary" href="#tees">Pre-order now</a><button className="secondary" onClick={shareDrop}>Share DROP 01</button></div></section>
  </main>
}
