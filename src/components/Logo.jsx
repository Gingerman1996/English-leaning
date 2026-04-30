import { motion } from 'framer-motion';

// LengList — three pillars of the brand:
//   • bold "L" letterform → language / Leng
//   • three horizontal bars → the list of words to learn
//   • a sound-wave dot → audio pronunciation, the new core feature
export default function Logo({ size = 36 }) {
  return (
    <motion.div
      initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id="ll-grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="55%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="ll-shine" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.22" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#ll-grad)" />
        <rect x="2" y="2" width="60" height="32" rx="16" fill="url(#ll-shine)" />

        {/* Bold L */}
        <path
          d="M 16 14 L 16 46 L 28 46"
          stroke="white"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* List bars (descending length = the user's vocabulary growing) */}
        <line x1="34" y1="20" x2="50" y2="20" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.95" />
        <line x1="34" y1="30" x2="46" y2="30" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.78" />
        <line x1="34" y1="40" x2="42" y2="40" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />

        {/* Sound-wave dot — the new pronunciation feature */}
        <circle cx="50" cy="40" r="2.6" fill="#fef3c7" />
        <circle cx="50" cy="40" r="5.5" fill="none" stroke="#fef3c7" strokeWidth="1.2" opacity="0.55" />
      </svg>
    </motion.div>
  );
}
