import { motion } from 'framer-motion';

export default function StatCard({ label, value, sub, icon, accent = 'from-fuchsia-500 to-violet-500' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass relative overflow-hidden rounded-3xl p-5"
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-30 blur-2xl`}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-white/50">{label}</span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <div className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-white/55">{sub}</div>}
    </motion.div>
  );
}
