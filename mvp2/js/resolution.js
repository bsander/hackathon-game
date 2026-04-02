import { BEATS } from './constants.js';

export function resolveSpells(attackSpell, defendSpell) {
  if (defendSpell === null || defendSpell === undefined) {
    return { outcome: 'HIT', attackSpell, defendSpell: null };
  }
  if (attackSpell === defendSpell) {
    return { outcome: 'CLASH', attackSpell, defendSpell };
  }
  if (BEATS[defendSpell] === attackSpell) {
    return { outcome: 'BLOCKED', attackSpell, defendSpell };
  }
  return { outcome: 'HIT', attackSpell, defendSpell };
}

export function nextStateAfterResolve(outcome, currentScore, winScore) {
  if (outcome === 'HIT') {
    const newScore = currentScore + 1;
    return {
      scoreChange: 1,
      next: newScore >= winScore ? 'GAME_OVER' : 'NEXT_ROUND',
    };
  }
  return { scoreChange: 0, next: 'SWAP' };
}
