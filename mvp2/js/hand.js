import { SPELLS } from './constants.js';
import { shuffleArray } from './utils.js';

// Each player draws from their own full deck of 15 cards (5 of each type)
const FULL_DECK = [...SPELLS, ...SPELLS, ...SPELLS, ...SPELLS, ...SPELLS];

export function dealHand() {
  return shuffleArray(FULL_DECK).slice(0, 5);
}

export function spendCard(hand, spell) {
  const idx = hand.indexOf(spell);
  if (idx === -1) return hand;
  return [...hand.slice(0, idx), ...hand.slice(idx + 1)];
}

export function hasSpell(hand, spell) {
  return hand.includes(spell);
}

export function isEmpty(hand) {
  return hand.length === 0;
}

export function handCounts(hand) {
  return Object.fromEntries(SPELLS.map(s => [s, hand.filter(c => c === s).length]));
}

export function availableSpells(hand) {
  return SPELLS.filter(s => hand.includes(s));
}
