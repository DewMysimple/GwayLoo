import { describe, expect, it } from 'vitest';
import { watercolorLutStrength } from './watercolor-material';

describe('watercolor quality tuning', () => {
  it('disables LUT sampling impact for low-tier devices and scales it predictably', () => {
    expect(watercolorLutStrength('low')).toBe(0);
    expect(watercolorLutStrength('medium')).toBe(0.08);
    expect(watercolorLutStrength('high')).toBe(0.14);
  });
});
