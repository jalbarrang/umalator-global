import { config } from '@/config';

// First-load splash shown while the core datasets fetch via the manifest, before
// the app (and the theme provider) mount. Self-contained styles + prefers-color-
// scheme so it works with no theme context. Approved design:
// .plans/_prototypes/torena-sim-data-boot-splash-v2.html
const SPLASH_CSS = `
.boot-splash {
  position: fixed; inset: 0; z-index: 9999;
  display: grid; place-items: center;
  background: #101010; color: #fafafa;
  font-family: 'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: light) {
  .boot-splash { background: #f5f1e6; color: #4a3f35; }
  .boot-splash__bar { background: #e3dcc9; }
  .boot-splash__caption { color: #7d6b56; }
}
.boot-splash__inner { display: flex; flex-direction: column; align-items: center; gap: 22px; }
.boot-splash__logo {
  width: 132px; height: 132px; object-fit: contain;
  filter: drop-shadow(0 0 26px rgba(188, 158, 83, 0.28));
  animation: boot-splash-breathe 2.6s ease-in-out infinite;
}
.boot-splash__stack { text-align: center; display: flex; flex-direction: column; gap: 13px; align-items: center; }
.boot-splash__title { font-size: 19px; font-weight: 600; letter-spacing: 0.3px; }
.boot-splash__title b { color: #bc9e53; font-weight: 700; }
.boot-splash__bar { width: 196px; height: 3px; border-radius: 99px; background: #2a2a2a; overflow: hidden; }
.boot-splash__bar i {
  display: block; width: 38%; height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, #66bf0d, #8fdc3a);
  animation: boot-splash-slide 1.15s ease-in-out infinite;
}
.boot-splash__caption { font-size: 13px; color: #8a8a8a; }
@keyframes boot-splash-breathe { 0%, 100% { transform: scale(1); opacity: 0.94; } 50% { transform: scale(1.045); opacity: 1; } }
@keyframes boot-splash-slide { 0% { transform: translateX(-120%); } 100% { transform: translateX(380%); } }
@media (prefers-reduced-motion: reduce) { .boot-splash__logo, .boot-splash__bar i { animation: none; } }
`;

type BootSplashProps = {
  /** When set, shows an error message instead of the loading bar. */
  error?: string;
};

export function BootSplash(props: BootSplashProps) {
  const { error } = props;

  return (
    <div className="boot-splash" role="status" aria-live="polite" aria-label="Loading Torena Sim">
      <style>{SPLASH_CSS}</style>
      <div className="boot-splash__inner">
        <img className="boot-splash__logo" src={`${config.basePath}social-logo.png`} alt="Torena Sim" />
        <div className="boot-splash__stack">
          <div className="boot-splash__title">
            Torena <b>Sim</b>
          </div>
          {error ? (
            <div className="boot-splash__caption" role="alert">
              Failed to load race data. Please refresh.
            </div>
          ) : (
            <>
              <div className="boot-splash__bar">
                <i />
              </div>
              <div className="boot-splash__caption">Loading race data…</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
