import { describe, it, expect } from 'vitest';
import { filteredKeyMap } from '../js/utils.js';

describe('filteredKeyMap', () => {
  it('returns all keys for player 1 when all spells available', () => {
    const map = filteredKeyMap(1, ['Fireball', 'Shield', 'Hex']);
    expect(map).toEqual({ '1': 'Fireball', '2': 'Shield', '3': 'Hex' });
  });

  it('returns all keys for player 2 when all spells available', () => {
    const map = filteredKeyMap(2, ['Fireball', 'Shield', 'Hex']);
    expect(map).toEqual({ '8': 'Fireball', '9': 'Shield', '0': 'Hex' });
  });

  it('omits keys for depleted spell types', () => {
    const map = filteredKeyMap(1, ['Fireball', 'Shield']);
    expect(map).toEqual({ '1': 'Fireball', '2': 'Shield' });
    expect(map['3']).toBeUndefined();
  });

  it('returns empty object when no spells available', () => {
    expect(filteredKeyMap(1, [])).toEqual({});
  });

  it('handles single available spell', () => {
    const map = filteredKeyMap(2, ['Hex']);
    expect(map).toEqual({ '0': 'Hex' });
  });
});
