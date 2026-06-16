import { describe, it, expect } from 'vitest';
import {
  MINIMAP_ZOOM_LEVELS,
  MINIMAP_ZOOM_DEFAULT,
  clampMinimapZoom,
  nextMinimapZoom,
  isMinMinimapZoom,
  isMaxMinimapZoom,
  formatMinimapZoom,
} from '../src/ui/minimap_zoom';

describe('minimap zoom', () => {
  it('default is the first (1x) preset = unchanged shipped scale', () => {
    expect(MINIMAP_ZOOM_DEFAULT).toBe(1);
    expect(MINIMAP_ZOOM_LEVELS[0]).toBe(1);
  });

  it('clamps arbitrary / garbage values to the nearest preset', () => {
    expect(clampMinimapZoom(1.4)).toBe(1.5);
    expect(clampMinimapZoom(2.4)).toBe(2);
    expect(clampMinimapZoom(99)).toBe(3);
    expect(clampMinimapZoom(0)).toBe(1);
    expect(clampMinimapZoom(NaN)).toBe(MINIMAP_ZOOM_DEFAULT);
    expect(clampMinimapZoom(Infinity)).toBe(MINIMAP_ZOOM_DEFAULT);
  });

  it('steps through presets and clamps at the ends (no wrap)', () => {
    expect(nextMinimapZoom(1, +1)).toBe(1.5);
    expect(nextMinimapZoom(1.5, +1)).toBe(2);
    expect(nextMinimapZoom(2, +1)).toBe(3);
    expect(nextMinimapZoom(3, +1)).toBe(3); // clamped at max
    expect(nextMinimapZoom(2, -1)).toBe(1.5);
    expect(nextMinimapZoom(1, -1)).toBe(1); // clamped at min
  });

  it('reports boundary state', () => {
    expect(isMinMinimapZoom(1)).toBe(true);
    expect(isMinMinimapZoom(1.5)).toBe(false);
    expect(isMaxMinimapZoom(3)).toBe(true);
    expect(isMaxMinimapZoom(2)).toBe(false);
  });

  it('formats a compact, trailing-zero-free readout', () => {
    expect(formatMinimapZoom(1)).toBe('1×');
    expect(formatMinimapZoom(1.5)).toBe('1.5×');
    expect(formatMinimapZoom(2)).toBe('2×');
    expect(formatMinimapZoom(3)).toBe('3×');
  });
});
