import { BEATS, CHAOS } from './constants.js';

/**
 * Determine the outcome of an attack/defend exchange.
 * Returns only the outcome enum — display text is the caller's concern.
 */
export function resolveSpells(attackSpell, defendSpell) {
  if (defendSpell === null || defendSpell === undefined) {
    return { outcome: 'HIT', attackSpell, defendSpell: null };
  }
  if (attackSpell === CHAOS || defendSpell === CHAOS) {
    const outcome = Math.random() < 0.5 ? 'HIT' : 'BLOCKED';
    return { outcome, attackSpell, defendSpell };
  }
  if (attackSpell === defendSpell) {
    return { outcome: 'CLASH', attackSpell, defendSpell };
  }
  if (BEATS[defendSpell] === attackSpell) {
    return { outcome: 'BLOCKED', attackSpell, defendSpell };
  }
  return { outcome: 'HIT', attackSpell, defendSpell };
}

/**
 * Given an outcome, determine what happens next.
 * currentScore is the attacker's score BEFORE this round.
 */
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
