import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ExperienceAudioManifest } from '../../../content/assets';

export interface ExperienceAudioController {
  unmuteFromGesture: () => void;
  playBackFeedback: () => void;
  playLandscapeFeedback: () => void;
}

interface ExperienceAudioElements {
  main: HTMLAudioElement;
  poem: HTMLAudioElement;
  painting: HTMLAudioElement;
  feedbackBack: HTMLAudioElement;
  feedbackLandscape: HTMLAudioElement;
}

function createAudio(source: string): HTMLAudioElement {
  const element = new Audio(source);
  element.preload = 'none';
  return element;
}

function resetAndPlay(audio: HTMLAudioElement): void {
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

export function useExperienceAudio(
  sources: ExperienceAudioManifest,
  muted: boolean,
  landscapeOpen: boolean,
): ExperienceAudioController {
  const unlockedRef = useRef(false);
  const audio = useMemo<ExperienceAudioElements>(() => ({
    main: createAudio(sources.main),
    poem: createAudio(sources.poem),
    painting: createAudio(sources.painting),
    feedbackBack: createAudio(sources.feedbackBack),
    feedbackLandscape: createAudio(sources.feedbackLandscape),
  }), [sources]);
  const allAudio = useMemo(() => Object.values(audio), [audio]);

  const activeTrack = useCallback(
    () => landscapeOpen ? audio.painting : audio.main,
    [audio, landscapeOpen],
  );

  const unmuteFromGesture = useCallback(() => {
    allAudio.forEach((element) => {
      if (!unlockedRef.current) element.load();
      element.muted = false;
    });
    unlockedRef.current = true;
    void activeTrack().play().catch(() => undefined);
  }, [activeTrack, allAudio]);

  useEffect(() => {
    audio.main.loop = true;
    audio.poem.loop = true;
    audio.painting.loop = true;
    allAudio.forEach((element) => {
      element.muted = muted;
    });

    if (muted) {
      allAudio.forEach((element) => element.pause());
      return;
    }

    const active = landscapeOpen ? audio.painting : audio.main;
    allAudio.forEach((element) => {
      if (element !== active) element.pause();
    });
    void active.play().catch(() => undefined);
  }, [allAudio, audio, landscapeOpen, muted]);

  useEffect(() => () => {
    allAudio.forEach((element) => {
      element.pause();
      element.removeAttribute('src');
      element.load();
    });
  }, [allAudio]);

  return {
    unmuteFromGesture,
    playBackFeedback: () => {
      if (!muted) resetAndPlay(audio.feedbackBack);
    },
    playLandscapeFeedback: () => {
      if (!muted) resetAndPlay(audio.feedbackLandscape);
    },
  };
}
