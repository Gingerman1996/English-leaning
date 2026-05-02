import { motion } from 'framer-motion';

// Side rail for the Reader. Wide enough to show icon + label inline, so
// users don't need to memorize what each icon means and there are no
// hover tooltips that can collide with the panel content. On mobile it
// collapses to a horizontal pill row.
//
// Each item: { id, label, icon, badge? }

export default function ReaderRail({ items, active, onChange }) {
  return (
    <>
      {/* Vertical rail — visible from sm+ */}
      <nav
        aria-label="Reader sections"
        className="hidden w-44 shrink-0 sm:sticky sm:top-24 sm:flex sm:flex-col sm:gap-1 sm:self-start sm:rounded-3xl sm:border sm:border-white/10 sm:bg-white/[0.04] sm:p-2 sm:backdrop-blur-xl lg:w-48"
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              aria-pressed={isActive}
              className={[
                'relative flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm transition',
                isActive
                  ? 'bg-white/15 text-white shadow-inner'
                  : 'text-white/75 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              {/* Active indicator stripe on the left edge — VS Code-style. */}
              {isActive && (
                <motion.span
                  layoutId="rail-indicator"
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-fuchsia-400"
                />
              )}
              <span className="text-base leading-none" aria-hidden>{item.icon}</span>
              <span className="flex-1 truncate font-medium">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[10px] font-bold text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Horizontal pill row — mobile fallback */}
      <nav
        aria-label="Reader sections"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 sm:hidden"
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              aria-pressed={isActive}
              className={[
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition',
                isActive
                  ? 'bg-white text-slate-900 font-semibold shadow'
                  : 'bg-white/5 text-white/75 hover:bg-white/10',
              ].join(' ')}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[9px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
