import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('AURA Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 20, fontFamily: 'monospace', color: '#fff',
          background: '#0A0A0F', minHeight: '100vh', overflowY: 'auto',
        }}>
          <h1 style={{ color: '#FCA5A5', fontSize: 20, marginBottom: 12 }}>
            🚨 AURA crash
          </h1>
          <p style={{ color: '#BEF264', marginBottom: 8, fontSize: 14 }}>
            Messaggio:
          </p>
          <pre style={{
            background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8,
            fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16,
          }}>
            {this.state.error?.message || 'Errore sconosciuto'}
          </pre>
          <p style={{ color: '#67E8F9', marginBottom: 8, fontSize: 14 }}>
            Stack:
          </p>
          <pre style={{
            background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8,
            fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16,
          }}>
            {this.state.error?.stack || 'Nessuno stack disponibile'}
          </pre>
          {this.state.errorInfo && (
            <>
              <p style={{ color: '#F0ABFC', marginBottom: 8, fontSize: 14 }}>
                Component stack:
              </p>
              <pre style={{
                background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8,
                fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16,
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </>
          )}
          <button
            onClick={() => {
              localStorage.removeItem('aura_v4');
              localStorage.removeItem('aura_v3');
              window.location.reload();
            }}
            style={{
              background: '#BEF264', color: '#000', border: 'none', padding: '12px 24px',
              borderRadius: 12, fontWeight: 700, cursor: 'pointer', marginRight: 8,
            }}
          >
            Reset dati e ricarica
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
              padding: '12px 24px', borderRadius: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Solo ricarica
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
