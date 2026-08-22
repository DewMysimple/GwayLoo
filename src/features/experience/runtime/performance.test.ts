import { describe, expect, it } from 'vitest';
import { detectPerformanceTier } from './performance';

function navigatorWith(memory: number | undefined, cores: number): Navigator {
  return { deviceMemory: memory, hardwareConcurrency: cores } as Navigator & { deviceMemory?: number };
}

describe('performance tier selection', () => {
  it('uses stable low, medium and high capability boundaries', () => {
    expect(detectPerformanceTier(navigatorWith(2, 2))).toBe('low');
    expect(detectPerformanceTier(navigatorWith(6, 6))).toBe('medium');
    expect(detectPerformanceTier(navigatorWith(8, 8))).toBe('high');
  });
});
