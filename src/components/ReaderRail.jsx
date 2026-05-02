import { motion } from 'framer-motion';

// Vertical activity bar for the Reader. Inspired by VS Code's leftmost
// strip. On screens narrower than `sm`, it collapses to a horizontal pill
// row above the main content.
//
// Each item: { id, label, icon, badge? }

export default function ReaderRail({ items, active, onChange }) {
  return (
    <>
      {/* Vertical rail — visible from sm+ */}
      <nav
        aria-label="Reader sections"
        className="hidden shrink-0 sm:sticky sm:top-24 sm:flex sm:flex-col sm:items-stretch sm:gap-1 sm:self-start sm:rounded-3xl sm:border sm:border-white/10 sm:bg-white/[0.04] sm:p-2 sm:backdrop-blur-xl"
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              title={item.label}
              aria-label={item.label}
              aria-pressed={isActive}
              className={[
                'group relative flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition',
                isActive
                  ? 'bg-white/15 text-white shadow-inner'
                  : 'text-white/65 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              {/* Active indicator stripe on the left edge — VS Code-style. */}
              {isActive && (
                <motion.span
                  layoutId="rail-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-fuchsia-400"
                />
              )}
              <span aria-hidden>{item.icon}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[9px] font-bold text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}

              {/* Hover tooltip — only for sm+ where the rail is icon-only. */}
              <span className="pointer-events-none absolute left-full top-1/2 z-10 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow transition group-hover:opacity-100">
                {item.label}
              </span>
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
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[9px] font-bold text-white">
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
