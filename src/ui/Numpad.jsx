/**
 * Tastierino. Tasti alti 46 px perché un tasto da 44 è il minimo tollerabile
 * e questo si usa con il pollice, al volo, davanti alla cassa.
 */

import { Backspace } from '@phosphor-icons/react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back'];

export function Numpad({ onPress }) {
  return (
    <div className="grid grid-cols-3 gap-[9px] px-4 pt-3">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onPress(k)}
          aria-label={k === 'back' ? 'Cancella' : k}
          className="flex h-[46px] items-center justify-center text-2xl"
          style={{
            background: 'var(--card)',
            borderRadius: 9,
            boxShadow: '0 1px 0 rgba(0,0,0,0.12)',
            color: 'var(--label)',
          }}
        >
          {k === 'back' ? <Backspace size={22} /> : k}
        </button>
      ))}
    </div>
  );
}
