import type { BootState } from './boot';

export function BootLoader({ brandName, state }: { brandName: string; state: BootState }) {
  if (state.complete) return null;

  return (
    <div
      aria-label={`${brandName} 正在启动`}
      className="verminoble-boot-loader"
      id="loader"
      role="status"
    >
      <div className="verminoble-boot-loader__content">
        <span className="verminoble-boot-loader__wordmark">{brandName}</span>
        <span className="verminoble-boot-loader__track" aria-hidden="true">
          <span
            className="verminoble-boot-loader__progress"
            style={{ transform: `scaleX(${state.progress / 100})` }}
          />
        </span>
      </div>
    </div>
  );
}
