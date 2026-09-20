import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function PaymentShell({title,children}){
  return <main className="ma-learner">
    <section className="ma-learner-hero">
      <div><span className="ma-kicker">ALLEGRO MUSIC ACADEMY</span><h1>{title}</h1>{children}</div>
      <Link className="ma-secondary" to="/music-academy">Back to Academy</Link>
    </section>
  </main>
}

export function MusicAcademyPaymentSuccess(){
  const ref=new URLSearchParams(window.location.search).get('ref')||''
  const [state,setState]=useState({status:'checking',message:'Confirming your payment securely with iKhokha…'})

  const verify=useCallback(async()=>{
    if(!ref){setState({status:'error',message:'The payment reference is missing.'});return}
    setState({status:'checking',message:'Confirming your payment securely with iKhokha…'})
    try{
      const response=await fetch(`/api/academy/verify?externalReference=${encodeURIComponent(ref)}`,{credentials:'same-origin'})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'Payment verification failed.')
      if(data.paid){setState({status:'paid',message:'Payment confirmed. Your 30-day Academy pass is active.'});return}
      setState({status:'pending',message:`iKhokha status: ${data.status||'PENDING'}. If you have just paid, wait a moment and check again.`})
    }catch(error){
      setState({status:'error',message:error?.message||'Payment verification failed.'})
    }
  },[ref])

  useEffect(()=>{verify()},[verify])

  return <PaymentShell title={state.status==='paid'?'You’re in.':'Checking your Academy pass.'}>
    <p>{state.message}</p>
    <div className="ma-actions">
      {state.status==='paid'&&<Link className="ma-primary" to="/music-academy/my-learning">Open My Learning</Link>}
      {(state.status==='pending'||state.status==='error')&&<button type="button" className="ma-primary" onClick={verify}>Check payment again</button>}
      <a className="ma-secondary" href="mailto:info@izakhonoafrica.co.za?subject=ALLEGRO%20Music%20Academy%20payment%20query">Payment help</a>
    </div>
    <p><small>Do not pay a second time while a completed transaction is still being verified.</small></p>
  </PaymentShell>
}

export function MusicAcademyPaymentFailed(){
  return <PaymentShell title="Payment was not completed.">
    <p>No Academy access has been activated. You can return to pricing and try again when ready.</p>
    <div className="ma-actions"><Link className="ma-primary" to="/music-academy#pricing">Return to pricing</Link></div>
  </PaymentShell>
}

export function MusicAcademyPaymentCancelled(){
  return <PaymentShell title="Checkout cancelled.">
    <p>You have not been charged by this Academy flow and your free practice tools remain available.</p>
    <div className="ma-actions"><Link className="ma-primary" to="/music-academy#sight-reading">Keep practising free</Link><Link className="ma-secondary" to="/music-academy#pricing">View pass</Link></div>
  </PaymentShell>
}
