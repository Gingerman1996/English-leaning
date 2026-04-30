import { motion } from 'framer-motion';

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
          <linearGradient id="logoGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#logoGrad)" />
        <path
          d="M22 18h20a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4h-9l-6 5v-5h-5a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z"
          fill="white"
          opacity="0.95"
        />
        <text
          x="50%"
          y="56%"
          textAnchor="middle"
          fontFamily="Plus Jakarta Sans, sans-serif"
          fontWeight="800"
          fontSize="18"
          fill="#3b3fe8"
        >
          Lx
        </text>
      </svg>
    </motion.div>
  );
}
