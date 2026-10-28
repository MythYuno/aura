/**
 * Il quadratino di categoria: 29 pt, raggio 7, glifo bianco pieno al centro.
 * È il modo in cui lo fanno Wallet e Salute, e il solo posto dove i colori di
 * categoria hanno diritto di esistere — fuori da qui competerebbero col
 * responso, che è l'unica cosa che deve parlare col colore.
 */

import {
  ForkKnife,
  House,
  Car,
  FirstAidKit,
  FilmSlate,
  ShoppingBag,
  DotsThreeCircle,
} from '@phosphor-icons/react';

const GLYPH = {
  food: ForkKnife,
  home: House,
  transport: Car,
  health: FirstAidKit,
  fun: FilmSlate,
  wants: ShoppingBag,
  other: DotsThreeCircle,
};

const FALLBACK_COLOR = '#8A8A99';

export function CategoryIcon({ catId, categories = [], size = 29 }) {
  const Glyph = GLYPH[catId] ?? DotsThreeCircle;
  const color = categories.find((c) => c.id === catId)?.color ?? FALLBACK_COLOR;

  return (
    <span
      aria-hidden="true"
      className="flex flex-none items-center justify-center"
      style={{ width: size, height: size, borderRadius: 'var(--radius-tile)', background: color }}
    >
      <Glyph size={Math.round(size * 0.58)} weight="fill" color="#fff" />
    </span>
  );
}
