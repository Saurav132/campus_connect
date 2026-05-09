import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { motion, HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    
    const variants = {
      primary: 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-md shadow-yellow-500/20 dark:shadow-yellow-500/10 border border-yellow-400 dark:border-yellow-600',
      secondary: 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 border border-[var(--card-border)] shadow-sm',
      outline: 'bg-transparent border-2 border-yellow-500 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10',
      ghost: 'bg-transparent text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20',
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-sm font-medium',
      lg: 'h-14 px-8 text-base font-medium',
      icon: 'h-11 w-11 flex justify-center items-center',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={disabled || isLoading ? undefined : { scale: 1.02 }}
        whileTap={disabled || isLoading ? undefined : { scale: 0.98 }}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden',
          variants[variant],
          sizes[size],
          className
        )}
        {...(props as any)}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
        
        {/* Subtle glass reflection for primary variant */}
        {variant === 'primary' && (
          <div className="absolute inset-0 top-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-xl" />
        )}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';
