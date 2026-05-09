import { Outlet } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function AuthLayout() {
  const { theme } = useTheme();

  return (
    <div className="dark min-h-screen bg-slate-950 flex relative overflow-hidden text-white">
      {/* Background ambient light */}
      <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-yellow-300/5 blur-[100px] rounded-full -z-10"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-600/5 blur-[150px] rounded-full -z-10"></div>

      {/* Left side UI */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-28 w-full lg:w-1/2 z-10 relative">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto w-full max-w-sm lg:w-[400px]"
        >
          <Outlet />
        </motion.div>
      </div>

      {/* Right side cinematic showcase */}
      <div className="hidden lg:block relative flex-1 z-10 p-4">
        <div className="absolute inset-4 rounded-[2rem] overflow-hidden glass-card shadow-2xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] flex flex-col items-center justify-center border-[var(--card-border)] border">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ duration: 0.8, delay: 0.2 }}
             className="relative z-10 flex flex-col items-center text-center p-12 max-w-md"
           >
             <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center mb-8 shadow-xl">
               <Sparkles className="w-8 h-8 text-white" />
             </div>
             
             <h2 className="text-4xl font-bold tracking-tight mb-4 text-[var(--text-primary)]">
               Welcome to <br/> Campus Connect AI
             </h2>
             <p className="text-lg text-[var(--text-secondary)]">
               Connect with mentors, find exclusive opportunities, and accelerate your career with AI-powered networking.
             </p>
           </motion.div>

           {/* Abstract Floating UI Elements for aesthetic */}
           <motion.div 
             animate={{ y: [0, -20, 0] }} 
             transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
             className="absolute top-[20%] left-[10%] w-32 h-16 glass-card rounded-xl border border-white/20 dark:border-white/5 opacity-60 mix-blend-overlay"
           />
           <motion.div 
             animate={{ y: [0, 30, 0] }} 
             transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
             className="absolute bottom-[20%] right-[15%] w-48 h-24 glass-card rounded-2xl border border-white/20 dark:border-white/5 opacity-50 mix-blend-overlay"
           />
        </div>
      </div>
    </div>
  );
}
