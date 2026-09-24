import { Component } from 'react'
import { recordOperationalEvent } from '../services/opsService'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    recordOperationalEvent({
      eventType: 'react_error_boundary',
      severity: 'error',
      route: window.location.pathname,
      message: error?.message || 'Unknown React error',
      metadata: { componentStack: info?.componentStack || '' },
    })
  }

  render() {
    if (this.state.error) {
      return (
        <main className="container page-pad">
          <div className="panel">
            <p className="eyebrow">ALLEGRO-VIBEZ RECOVERY</p>
            <h1>Something went wrong.</h1>
            <p className="lede">The error was contained so the rest of the application can recover safely.</p>
            <div className="notice error">{this.state.error.message}</div>
            <button className="pill-button" onClick={() => window.location.assign('/')}>Return home</button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
