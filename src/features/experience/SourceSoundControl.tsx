interface SourceSoundControlProps {
  hidden?: boolean;
  muted?: boolean;
  onClick?: () => void;
  soundOffLabel?: string;
  soundOnLabel?: string;
}

export function SourceSoundGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 921.5 41.9">
      <path
        d="M0 .5c19.1 0 19.1 40.9 37.7 40.9C56.8 41.4 56.8.5 75.4.5c19.1 0 19.1 40.9 37.7 40.9"
        fill="none"
        stroke="currentColor"
      />
      <path
        d="M0 .5c19.1 0 19.1 40.9 37.7 40.9C56.8 41.4 56.8.5 75.4.5c19.1 0 19.1 40.9 37.7 40.9"
        fill="none"
        stroke="currentColor"
      />
      <path
        d="M113 40.9c19.1 0 19.1-38.1 37.7-38.1 19.1 0 19.1 33.1 37.7 33.1 19.1 0 19.1-27.7 37.7-27.7 19.1 0 19.1 22.7 37.7 22.7 19.1 0 19.1-17.7 37.7-17.7 19.1 0 19.1 12.7 37.7 12.7 19.1 0 19.1-7.7 37.7-7.7 19.1 0 19.1 5 37.7 5 19.1 0 19.1-1.8 37.7-1.8 19.1 0 17.7 0 36.3 0 19.1 0 13.6 0 32.2 0 19.1 0 23.6 0 42.7 0 19.1 0 264.2 0 283.3 0"
        fill="none"
        stroke="currentColor"
      />
    </svg>
  );
}

export function SourceSoundControl({
  hidden = false,
  muted = true,
  onClick,
  soundOffLabel = 'Turn sound off',
  soundOnLabel = 'Turn sound on',
}: SourceSoundControlProps) {
  const label = muted ? soundOnLabel : soundOffLabel;

  return (
    <button
      aria-label={label}
      className={`sound${hidden ? ' hidden' : ''}${muted ? ' is-off' : ''}`}
      onClick={onClick}
      title={label}
      type="button"
    >
      <span className="sound__container"><SourceSoundGlyph /></span>
    </button>
  );
}
