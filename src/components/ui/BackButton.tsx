import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate(-1)}
      className={cn(
        'flex items-center justify-center w-10 h-10 rounded-full glass-card transition-colors hover:bg-black/5 dark:hover:bg-white/10',
        className
      )}
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5 text-[var(--bg-secondary)] text-[var(--text-primary)]" />
    </motion.button>
  );
}
