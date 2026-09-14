import { ui } from '../ui';

const NAV_ITEMS = [
  { id: 'setup', label: 'Setup', states: ['setup'] },
  { id: 'wishlist', label: 'Wishlist', states: ['wishlist_hub', 'wishlist_picker', 'resolve'] },
  { id: 'draft', label: 'Draft', states: ['draft'] },
  { id: 'schedule', label: 'Schedule', states: ['schedule'] },
  { id: 'timeclock', label: 'Time Clock', states: ['timeclock'] },
  { id: 'settings', label: 'Settings', states: ['settings'] },
];

export default function AppNav({ appState, onNavigate }) {
  return (
    <header className="app-nav bg-blue-600 text-white shadow-md print:hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Festy Blocks</h1>
          <p className="text-blue-100 text-xs hidden sm:block">Shift wishlist · conflict draft · schedule <span className="opacity-75">(v26.09.14b4)</span></p>
        </div>

        <nav className="flex gap-1.5 flex-wrap">
          {NAV_ITEMS.map(item => {
            const active = item.states.includes(appState);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                  active
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'bg-blue-500/40 text-white hover:bg-blue-500/70'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function PageShell({
  title,
  subtitle,
  actions,
  narrow = false,
  wide = false,
  children,
  className = '',
}) {
  const width = wide ? ui.pageWide : narrow ? ui.pageNarrow : ui.page;
  return (
    <div className={`${width} ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            {title && <h2 className={ui.sectionTitle}>{title}</h2>}
            {subtitle && <p className={ui.sectionSub}>{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function PageCard({ children, className = '', pad = true }) {
  return (
    <div className={`${ui.card} ${pad ? ui.cardPad : ''} ${className}`}>
      {children}
    </div>
  );
}

export function InfoBanner({ children, tone = 'blue' }) {
  const toneClass =
    tone === 'orange' ? ui.infoOrange : tone === 'gray' ? ui.infoGray : ui.infoBlue;
  return <div className={`${ui.infoBox} ${toneClass} mb-4`}>{children}</div>;
}

export function DayJumpBar({ days, onJump, lockedDays = {}, accent = 'blue' }) {
  return (
    <div className="flex gap-2">
      {days.map(day => {
        const locked = !!lockedDays[day];
        return (
          <button
            key={day}
            type="button"
            onClick={() => onJump(day)}
            className={`${ui.jumpBtn} ${
              locked ? 'bg-slate-200 text-slate-500' : accent === 'orange' ? 'hover:bg-orange-100 hover:text-orange-700' : ''
            }`}
          >
            Jump to {day}
          </button>
        );
      })}
    </div>
  );
}
