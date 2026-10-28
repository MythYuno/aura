/**
 * L'unico hook di stato. Niente Redux, niente provider annidati: un oggetto,
 * salvato con un ritardo di 400 ms perché scrivere a ogni tasto del tastierino
 * significherebbe serializzare lo stato dieci volte per una spesa.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { load, save } from './storage.js';
import { reconcile, UNTRACKED_TAG } from '../cycle/reconcile.js';
import { cycleFor } from '../cycle/boundaries.js';
import { toYmd } from '../cycle/day.js';

const SAVE_DELAY = 400;

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function useStore() {
  const [state, setState] = useState(load);
  const [storageOk, setStorageOk] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStorageOk(save(state)), SAVE_DELAY);
    return () => clearTimeout(timer.current);
  }, [state]);

  const addMovement = useCallback((movement) => {
    setState((s) => ({
      ...s,
      movements: [
        ...s.movements,
        { id: newId(), date: toYmd(new Date()), bound: 'free', ...movement },
      ],
    }));
  }, []);

  const updateMovement = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      movements: s.movements.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);

  const removeMovement = useCallback((id) => {
    setState((s) => ({ ...s, movements: s.movements.filter((m) => m.id !== id) }));
  }, []);

  const setSetup = useCallback((patch) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  /**
   * Riconcilia il ciclo di `today`. La voce non tracciata esistente per quel
   * ciclo viene **sostituita**, non aggiunta: riconciliare due volte lo stesso
   * ciclo conferma il buco, non lo raddoppia.
   */
  const applyReconcile = useCallback((bankTotalCents, today = new Date()) => {
    setState((s) => {
      const cycle = cycleFor(today, s.payDay);
      const endDay = toYmd(cycle.end);
      const { untracked } = reconcile(bankTotalCents, s.movements, cycle);
      const others = s.movements.filter(
        (m) => !(m.tag === UNTRACKED_TAG && m.date === endDay)
      );
      return {
        ...s,
        movements: untracked ? [...others, { id: newId(), ...untracked }] : others,
      };
    });
  }, []);

  return { state, storageOk, addMovement, updateMovement, removeMovement, setSetup, applyReconcile };
}
