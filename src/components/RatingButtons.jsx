// Shared 4-button SRS rating row used by FlashCard, InteractiveWord popover,
// and WordLookup popover. Two variants:
//
//   compact = false  (default) — used in FlashCard, single-row tall buttons
//                    with both label and subtitle ("Again / forgot").
//   compact = true   — used in popovers where vertical space is tight,
//                    single line per button ("Again", "Hard", ...).

const RATINGS = [
  { label: 'Again', sub: 'forgot',   tone: 'rose',    rating: 0 },
  { label: 'Hard',  sub: 'tough',    tone: 'amber',   rating: 1 },
  { label: 'Good',  sub: 'recalled', tone: 'emerald', rating: 2 },
  { label: 'Easy',  sub: 'mastered', tone: 'sky',     rating: 3 },
];

const TONE_CLASSES = {
  rose:    'bg-rose-500/15 hover:bg-rose-500/25 text-rose-100 border-rose-400/20',
  amber:   'bg-amber-500/15 hover:bg-amber-500/25 text-amber-100 border-amber-400/20',
  emerald: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 border-emerald-400/20',
  sky:     'bg-sky-500/15 hover:bg-sky-500/25 text-sky-100 border-sky-400/20',
};

export default function RatingButtons({ onRate, compact = false }) {
  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-1">
        {RATINGS.map((r) => (
          <button
            key={r.label}
            onClick={() => onRate(r.rating)}
            title={r.sub}
            className={[
              'rounded-lg border px-1 py-1.5 text-[11px] font-semibold transition',
              TONE_CLASSES[r.tone],
            ].join(' ')}
          >
            {r.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-2">
      {RATINGS.map((r) => (
        <button
          key={r.label}
          onClick={() => onRate(r.rating)}
          className={[
            'group flex flex-col items-center justify-center rounded-2xl border px-2 py-3 text-sm font-semibold transition hover:-translate-y-0.5',
            TONE_CLASSES[r.tone],
          ].join(' ')}
        >
          <span>{r.label}</span>
          <span className="text-[10px] font-normal opacity-70 group-hover:opacity-100">
            {r.sub}
          </span>
        </button>
      ))}
    </div>
  );
}
