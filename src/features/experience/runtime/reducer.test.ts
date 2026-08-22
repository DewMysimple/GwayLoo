import { describe, expect, it } from 'vitest';
import { createInitialRuntimeState, experienceRuntimeReducer } from './reducer';
import type { ExperienceRuntimeState } from './types';

describe('experienceRuntimeReducer', () => {
  it('keeps the two loading phases ordered even when assets finish first', () => {
    const initial = createInitialRuntimeState();
    const assetsReady = experienceRuntimeReducer(initial, { type: 'ASSETS_READY' });
    expect(assetsReady.phase).toBe('boot');
    expect(assetsReady.assetsReady).toBe(true);

    const secondLoader = experienceRuntimeReducer(assetsReady, { type: 'BOOT_COMPLETE' });
    expect(secondLoader.phase).toBe('loading');

    const exploring = experienceRuntimeReducer(secondLoader, { type: 'READY' });
    expect(exploring.phase).toBe('exploring');
  });

  it('derives poem and scene state from bounded scroll progress', () => {
    const state = { ...createInitialRuntimeState(), phase: 'exploring' as const };
    const next = experienceRuntimeReducer(state, { type: 'SCROLL_TO', progress: 0.6 });
    expect(next.scrollProgress).toBe(0.6);
    expect(next.activePoem).toBe(1);
    expect(next.activeScene).toBe(5);
  });

  it('opens, closes, mutes and restarts deterministically', () => {
    let state: ExperienceRuntimeState = { ...createInitialRuntimeState(), phase: 'exploring' };
    state = experienceRuntimeReducer(state, { type: 'OPEN_LANDSCAPE', scene: 3 });
    expect(state.landscapeScene).toBe(3);
    state = experienceRuntimeReducer(state, { type: 'TOGGLE_SOUND' });
    expect(state.muted).toBe(false);
    state = experienceRuntimeReducer(state, { type: 'SET_MUTED', muted: true });
    expect(state.muted).toBe(true);
    state = experienceRuntimeReducer(state, { type: 'CLOSE_LANDSCAPE' });
    expect(state.landscapeScene).toBeNull();
    state = experienceRuntimeReducer(state, { type: 'RESTART' });
    expect(state.scrollProgress).toBe(0);
    expect(state.phase).toBe('exploring');
  });

  it('moves to a visible error state when an asset fails', () => {
    const state = experienceRuntimeReducer(createInitialRuntimeState(), {
      type: 'FAIL',
      message: 'missing texture',
    });
    expect(state.phase).toBe('error');
    expect(state.error).toBe('missing texture');
  });
});
