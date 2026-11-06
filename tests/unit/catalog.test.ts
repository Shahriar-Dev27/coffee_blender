import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  CATALOG_STATUS,
  DEFAULT_SELECTION,
  OPTION_KEYS,
  findOption,
} from '@/config/catalog';

describe('catalog', () => {
  it('has unique ids within each option group', () => {
    for (const key of OPTION_KEYS) {
      const ids = (CATALOG[key] as { id: string }[]).map((option) => option.id);
      expect(new Set(ids).size, `duplicate id in ${key}`).toBe(ids.length);
    }
  });

  it('looks up option deltas by id', () => {
    expect(findOption('milk', 'oat')?.deltaCents).toBe(60);
  });

  it('returns undefined for an unknown id', () => {
    expect(findOption('blend', 'nope')).toBeUndefined();
  });

  it('is marked as placeholder', () => {
    expect(CATALOG_STATUS).toBe('placeholder');
  });

  it('resolves every default selection id', () => {
    for (const key of OPTION_KEYS) {
      expect(findOption(key, DEFAULT_SELECTION[key]), `default ${key}`).toBeDefined();
    }
  });
});
