import { ui } from '../ui';

const NAV_ITEMS = [
  { id: 'setup', label: 'Setup', states: ['setup'], roles: ['solo', 'facilitator'] },
  {
    id: 'wishlist',
    label: 'Wishlist',
    states: ['wishlist_hub', 'wishlist_picker', 'resolve'],
    roles: ['solo', 'facilitator', 'member'],
  },
  { id: 'draft', label: 'Draft', states: ['draft'], roles: ['solo', 'facilitator'] },
  {
    id: 'schedule',
    label: 'Schedule',
    states: ['schedule'],
    roles: ['solo', 'facilitator', 'member'],
    memberRequiresPublished: true,
  },
  { id: 'timeclock', label: 'Time Clock', states: ['timeclock'], roles: ['solo', 'facilitator'] },
  { id: 'settings', label: 'Settings', states: ['settings'], roles: ['solo', 'facilitator'] },
];

export default function AppNav({
  appState,
  onNavigate,
  role = 'solo',
  mode = 'solo',
  sessionCode = null,
  published = false,
}) {
  const items = NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (item.memberRequiresPublished && role === 'member' && !published) return false;
    return true;
  });
  const showHome = mode === 'solo' || mode === 'session';
  const homeLabel = mode === 'session' ? 'Leave' : 'Home';

  return (
    <header className="app-nav bg-blue-600 text-white shadow-md print:hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Festy Blocks</h1>
            {mode === 'session' && sessionCode && (
              <span className="bg-white/15 border border-white/30 rounded-md px-2 py-0.5 text-xs font-mono tracking-widest uppercase">
                {sessionCode}
              </span>
            )}
            {mode === 'session' && (
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                  role === 'facilitator'
                    ? 'bg-amber-400 text-amber-950'
                    : role === 'member'
                      ? 'bg-emerald-400 text-emerald-950'
                      : 'bg-slate-200 text-slate-800'
                }`}
              >
                {role}
              </span>
            )}
          </div>
          <p className="text-blue-100 text-xs hidden sm:block">
            Shift wishlist · conflict draft · schedule{' '}
            <span className="opacity-75">(v26.09.14b7)</span>
          </p>
        </div>

        <nav className="flex gap-1.5 flex-wrap">
          {items.map((item) => {
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
          {showHome && (
            <button
              type="button"
              onClick={() => onNavigate('lobby')}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition bg-blue-800/50 text-white hover:bg-blue-900/60"
              title={mode === 'session' ? 'Leave this session and return to the start screen' : 'Return to the start screen'}
            >
              {homeLabel}
            </button>
          )}
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
              locked ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : accent === 'orange' ? 'hover:bg-orange-100 dark:hover:bg-orange-900/40 hover:text-orange-700 dark:hover:text-orange-300' : ''
            }`}
          >
            Jump to {day}
          </button>
        );
      })}
    </div>
  );
}
