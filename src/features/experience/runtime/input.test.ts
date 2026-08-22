import { describe, expect, it } from 'vitest';
import { normalizeTouchDelta, normalizeWheelDelta, progressWithinSection } from './input';
import { resolveRuntime } from './selection';

describe('runtime input helpers', () => {
  it('normalizes wheel line and page units', () => {
    expect(normalizeWheelDelta(2, 1, 900)).toBe(32);
    expect(normalizeWheelDelta(1, 2, 900)).toBe(900);
    expect(normalizeWheelDelta(120, 0, 900)).toBe(120);
    expect(normalizeTouchDelta(500, 440)).toBe(60);
    expect(normalizeTouchDelta(440, 500)).toBe(-60);
  });

  it('bounds section progress and keeps legacy as the migration default', () => {
    expect(progressWithinSection(0, 2000, 900, -20)).toBe(0);
    expect(progressWithinSection(0, 2000, 900, 550)).toBe(0.5);
    expect(progressWithinSection(0, 2000, 900, 1500)).toBe(1);
    expect(resolveRuntime('')).toBe('legacy');
    expect(resolveRuntime('?runtime=r3f')).toBe('r3f');
  });
});
