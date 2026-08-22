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
