/** Shared Tailwind class tokens for consistent page styling */
export const ui = {
  page: 'max-w-5xl mx-auto pb-16',
  pageNarrow: 'max-w-2xl mx-auto pb-16',
  pageWide: 'max-w-6xl mx-auto pb-16',

  card: 'app-card rounded-xl shadow-md overflow-hidden',
  cardPad: 'p-5 sm:p-6',

  sectionTitle: 'text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100',
  sectionSub: 'text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1',

  stickyBar:
    'app-substicky bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b-4 shadow-md',
  stickyBlue: 'border-blue-500',
  stickyOrange: 'border-orange-500',

  dayBanner: 'rounded-t-xl px-5 py-4 text-white shadow-sm',
  dayBannerBlue: 'bg-blue-600',
  dayBannerOrange: 'bg-orange-600',
  dayBannerGray: 'bg-slate-500 dark:bg-slate-600',
  dayBody: 'app-card rounded-b-xl shadow-md border-t-0 p-5 sm:p-6',

  btnPrimary:
    'inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed',
  btnSuccess:
    'inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 transition shadow-sm',
  btnWarning:
    'inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-bold text-white bg-orange-600 hover:bg-orange-700 transition shadow-sm',
  btnSecondary:
    'inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition',
  btnGhost:
    'inline-flex items-center justify-center px-3 py-2 rounded-lg font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition',
  btnPurple:
    'inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/50 hover:bg-purple-200 dark:hover:bg-purple-900/40 transition',

  jumpBtn:
    'flex-1 py-2 rounded-lg font-bold capitalize transition shadow-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300',
  jumpBtnActive: 'bg-blue-600 text-white hover:bg-blue-600 hover:text-white',

  pill: 'px-3 py-1 rounded-full text-sm whitespace-nowrap',
  pillActive: 'bg-blue-600 text-white font-bold',
  pillIdle: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',

  infoBox: 'rounded-lg border p-3 text-sm',
  infoBlue: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900 text-blue-900 dark:text-blue-100',
  infoOrange: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900 text-orange-800 dark:text-orange-100',
  infoGray: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',

  input:
    'mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5',
  label: 'block text-sm font-semibold text-slate-700 dark:text-slate-200',

  modalOverlay: 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4',
  modal: 'bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100',

  slotRow: 'flex flex-col md:flex-row gap-4 border-b border-slate-100 dark:border-slate-700 pb-4 last:border-0 last:pb-0',
  artistChip: 'flex items-start gap-2 bg-purple-50 dark:bg-purple-950/40 p-2 rounded-lg',
};
