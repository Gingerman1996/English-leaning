import Logo from './Logo.jsx';

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'review', label: 'Review' },
  { id: 'read', label: 'Read' },
  { id: 'explore', label: 'Explore' },
  { id: 'stones', label: 'Stones' },
];

export default function Header({ tab, onTabChange, due }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-black/30 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <button
          onClick={() => onTabChange('home')}
          className="flex items-center gap-3 text-left"
        >
          <Logo size={36} />
          <div>
            <div className="heading text-lg leading-none">LengList</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">
              learn · listen · speak
            </div>
          </div>
        </button>

        <nav className="hidden items-center gap-1 sm:flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={[
                'relative rounded-full px-4 py-2 text-sm font-medium transition',
                tab === t.id
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-white/60 hover:text-white',
              ].join(' ')}
            >
              {t.label}
              {t.id === 'review' && due > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1.5 text-[10px] font-bold text-white">
                  {due > 99 ? '99+' : due}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5 pb-3 sm:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={[
              'rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap',
              tab === t.id ? 'bg-white/10 text-white' : 'text-white/60',
            ].join(' ')}
          >
            {t.label}
            {t.id === 'review' && due > 0 ? ` · ${due}` : ''}
          </button>
        ))}
      </div>
    </header>
  );
}
