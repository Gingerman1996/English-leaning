import { motion } from 'framer-motion';
import { MIND_STONES } from '../data/levels.js';

function Stone({ stone, unlocked, learnedCount, index }) {
  const progress = Math.min(1, learnedCount / stone.threshold);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
      className="glass relative overflow-hidden rounded-3xl p-5"
    >
      <div className="flex items-start gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          {unlocked && (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${stone.glow} 0%, transparent 70%)`,
                filter: 'blur(8px)',
              }}
            />
          )}
          <motion.svg
            viewBox="0 0 100 100"
            className="relative h-20 w-20"
            animate={
              unlocked
                ? { rotate: [0, 4, -4, 0], y: [0, -3, 0] }
                : {}
            }
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <defs>
              <radialGradient id={`g-${stone.key}`} cx="35%" cy="30%" r="80%">
                <stop offset="0%" stopColor="white" stopOpacity={unlocked ? 0.9 : 0.25} />
                <stop offset="40%" stopColor={stone.color} stopOpacity={unlocked ? 1 : 0.45} />
                <stop offset="100%" stopColor={stone.color} stopOpacity={unlocked ? 0.7 : 0.25} />
              </radialGradient>
              <linearGradient id={`s-${stone.key}`} x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="0.55" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              points="50,8 88,32 88,68 50,92 12,68 12,32"
              fill={`url(#g-${stone.key})`}
              stroke={unlocked ? stone.color : 'rgba(255,255,255,0.18)'}
              strokeWidth="2"
            />
            <polygon
              points="50,8 88,32 50,52 12,32"
              fill={`url(#s-${stone.key})`}
              opacity={unlocked ? 0.9 : 0.3}
            />
          </motion.svg>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="heading text-lg">{stone.name}</h4>
            <span
              className={[
                'rounded-full px-2 py-0.5 text-[10px] font-bold',
                unlocked ? 'bg-white text-slate-900' : 'bg-white/10 text-white/60',
              ].join(' ')}
            >
              {unlocked ? 'Unlocked' : `${stone.threshold} words`}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/65">{stone.description}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 1, delay: index * 0.05 }}
              className="h-full rounded-full"
              style={{ background: stone.color }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-white/50">
            {Math.min(learnedCount, stone.threshold).toLocaleString()} / {stone.threshold.toLocaleString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function MindStones({ learnedCount }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="heading text-2xl">Mind Stones</h2>
          <p className="text-sm text-white/55">Six legendary stones. Each one is forged by your own diligence.</p>
        </div>
        <div className="hidden text-right text-xs text-white/50 sm:block">
          {MIND_STONES.filter((s) => learnedCount >= s.threshold).length} / {MIND_STONES.length} collected
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MIND_STONES.map((s, i) => (
          <Stone
            key={s.key}
            stone={s}
            unlocked={learnedCount >= s.threshold}
            learnedCount={learnedCount}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
