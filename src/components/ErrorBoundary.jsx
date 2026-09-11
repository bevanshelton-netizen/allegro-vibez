import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError:false }
  }

  static getDerivedStateFromError() {
    return { hasError:true }
  }

  componentDidCatch(error, info) {
    console.error('ALLEGRO UI error', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return <main style={{minHeight:'100vh',background:'#07100d',color:'#f7f6f0',padding:'8vh 7vw',fontFamily:'Inter,system-ui,sans-serif'}}>
      <div style={{maxWidth:'900px',margin:'0 auto',border:'1px solid rgba(255,255,255,.14)',borderRadius:'28px',padding:'40px',background:'linear-gradient(145deg,rgba(12,166,120,.12),rgba(213,178,76,.07))'}}>
        <div style={{fontSize:'.78rem',fontWeight:900,letterSpacing:'.18em',color:'#9be5cc'}}>ALLEGRO VIBEZ · RECOVERY MODE</div>
        <h1 style={{fontFamily:'Georgia,serif',fontSize:'clamp(3rem,7vw,6rem)',lineHeight:'.95',fontWeight:500,margin:'.25em 0'}}>The page hit a display error.<br/><em style={{color:'#f1d67a'}}>Allegro is still available.</em></h1>
        <p style={{color:'#b4bbb7',fontSize:'1.1rem',lineHeight:1.7}}>Use the safe navigation below. This recovery screen prevents a browser or module error from leaving you with a blank page.</p>
        <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginTop:'24px'}}>
          <a href="/" style={{display:'inline-flex',padding:'13px 20px',borderRadius:'999px',background:'linear-gradient(135deg,#087f5b,#bf9632)',color:'white',fontWeight:900,textDecoration:'none'}}>Return to Allegro</a>
          <a href="/sa/protocol/" style={{display:'inline-flex',padding:'13px 20px',borderRadius:'999px',border:'1px solid rgba(255,255,255,.18)',color:'white',fontWeight:900,textDecoration:'none'}}>Open SHELTON PROTOCOL™</a>
        </div>
      </div>
    </main>
  }
}
