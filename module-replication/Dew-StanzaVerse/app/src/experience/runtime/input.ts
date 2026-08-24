export interface ScrollTimelineConfig {
  cameraAnimationDuration: number;
  cameraTailSeconds: number;
  sectionHeight: number;
}

export interface ScrollTimelineSample {
  sectionProgress: number;
  cameraTime: number;
  progress: number;
}

export function normalizeWheelDelta(deltaY: number, deltaMode: number, viewportHeight: number): number {
  if (deltaMode === 1) return deltaY * 16;
  if (deltaMode === 2) return deltaY * viewportHeight;
  return deltaY;
}

export function normalizeTouchDelta(previousClientY: number, currentClientY: number): number {
  return previousClientY - currentClientY;
}

export function progressWithinSection(
  sectionTop: number,
  sectionHeight: number,
  viewportHeight: number,
  scrollY: number,
): number {
  const available = Math.max(1, sectionHeight - viewportHeight);
  return Math.min(1, Math.max(0, (scrollY - sectionTop) / available));
}

/** Maps browser scroll to the complete baked-camera timeline without DOM access. */
export function mapScrollToTimeline(
  scrollY: number,
  sectionTop: number,
  config: ScrollTimelineConfig,
): ScrollTimelineSample {
  const localScroll = Math.max(0, scrollY - sectionTop);
  const sectionProgress = localScroll / Math.max(config.sectionHeight, 1);
  const mainDuration = Math.max(0, config.cameraAnimationDuration - config.cameraTailSeconds);
  const cameraTime = sectionProgress <= 1
    ? Math.min(sectionProgress, 1) * mainDuration
    : mainDuration + Math.min(sectionProgress - 1, 1) * config.cameraTailSeconds;
  const progress = Math.min(
    Math.max(cameraTime / Math.max(config.cameraAnimationDuration, 1), 0),
    1,
  );
  return { sectionProgress, cameraTime, progress };
}
