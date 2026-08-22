import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface ExperienceAudioController {
  unmuteFromGesture: () => void;
  playBackFeedback: () => void;
  playLandscapeFeedback: () => void;
}

function resetAndPlay(audio: HTMLAudioElement): void {
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

export function useExperienceAudio(
  sources: readonly string[],
  muted: boolean,
  landscapeOpen: boolean,
): ExperienceAudioController {
  const unlockedRef = useRef(false);
  const audio = useMemo(() => sources.map((source) => {
    const element = new Audio(source);
    element.preload = 'none';
    return element;
  }), [sources]);

  const activeTrack = useCallback(
    () => audio[landscapeOpen ? 2 : 0],
    [audio, landscapeOpen],
  );

  const unmuteFromGesture = useCallback(() => {
    audio.forEach((element) => {
      if (!unlockedRef.current) element.load();
      element.muted = false;
    });
    unlockedRef.current = true;
    const active = activeTrack();
    if (active) void active.play().catch(() => undefined);
  }, [activeTrack, audio]);

  useEffect(() => {
    const [main, poem, painting] = audio;
    main.loop = true;
    poem.loop = true;
    painting.loop = true;

    audio.forEach((element) => {
      element.muted = muted;
    });

    if (muted) {
      audio.forEach((element) => element.pause());
      return;
    }

    const active = landscapeOpen ? painting : main;
    audio.forEach((element) => {
      if (element !== active) element.pause();
    });
    void active.play().catch(() => undefined);
  }, [audio, landscapeOpen, muted]);

  useEffect(() => () => {
    audio.forEach((element) => {
      element.pause();
      element.removeAttribute('src');
      element.load();
    });
  }, [audio]);

  return {
    unmuteFromGesture,
    playBackFeedback: () => {
      if (!muted && audio[3]) resetAndPlay(audio[3]);
    },
    playLandscapeFeedback: () => {
      if (!muted && audio[4]) resetAndPlay(audio[4]);
    },
  };
}
