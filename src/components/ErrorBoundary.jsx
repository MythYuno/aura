/**
 * L'ultima rete. Se qualcosa esplode durante il render, questa schermata deve
 * dare una via d'uscita che funziona davvero.
 *
 * Quella di prima cancellava `aura_v4` e `aura_v3`, chiavi di una versione
 * che non esiste più: il pulsante ricaricava nello stesso errore, in un ciclo
 * senza uscita. E l'accesso era senza guardia, quindi in finestra privata il
 * pulsante lanciava e non faceva nulla.
 */

import { Component } from 'react';
import { STORAGE_KEY } from '../store/storage.js';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, cleared: false, failed: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.setState({ cleared: true });
      window.location.reload();
    } catch {
      // Finestra privata o dati del sito bloccati: non c'è niente da
      // cancellare, e dirlo è meglio che un pulsante che non reagisce.
      this.setState({ failed: true });
    }
  };

  render() {
    const { error, failed } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100%',
          background: 'var(--bg)',
          color: 'var(--label)',
          font: '17px/22px var(--font)',
          padding: '48px 20px',
        }}
      >
        <h1 style={{ fontSize: 28, lineHeight: '34px', fontWeight: 600, margin: 0, letterSpacing: '-0.023em' }}>
          Qui si è rotto qualcosa
        </h1>

        <p style={{ color: 'var(--label-2)', fontSize: 15, lineHeight: '20px', marginTop: 8 }}>
          Non è colpa di qualcosa che hai fatto. Ricaricare la pagina a volte basta. Se il problema
          torna a ogni apertura, è lo stato salvato a essere illeggibile, e l'unico modo di uscirne è
          ripartire da zero — perdendo i dati di questo browser.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              height: 50,
              padding: '0 20px',
              borderRadius: 13,
              border: 0,
              background: 'var(--accent)',
              color: 'var(--accent-on)',
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            Ricarica
          </button>

          <button
            type="button"
            onClick={this.reset}
            style={{
              height: 50,
              padding: '0 20px',
              borderRadius: 13,
              border: '1px solid var(--separator)',
              background: 'transparent',
              color: 'var(--bad)',
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            Cancella i dati e ricomincia
          </button>
        </div>

        {failed && (
          <p style={{ color: 'var(--bad)', fontSize: 13, lineHeight: '18px', marginTop: 16 }}>
            Questo browser non mi lascia toccare i dati del sito, quindi non c'è nulla da cancellare:
            prova a chiudere e riaprire la scheda.
          </p>
        )}

        <details style={{ marginTop: 32, color: 'var(--label-3)', fontSize: 13 }}>
          <summary style={{ cursor: 'pointer' }}>Dettaglio tecnico</summary>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 8 }}>
            {String(error?.stack || error?.message || error)}
          </pre>
        </details>
      </div>
    );
  }
}
