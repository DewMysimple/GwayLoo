import { describe, expect, it } from 'vitest';
import { deviceKindForMatches } from './device';

describe('device selection', () => {
  it('maps the responsive media query to the asset device kind', () => {
    expect(deviceKindForMatches(true)).toBe('mobile');
    expect(deviceKindForMatches(false)).toBe('desktop');
  });
});
