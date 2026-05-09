import React from 'react';
import { motion } from 'motion/react';

export default function FloatingOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {/* Ambient background glows */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-yellow-500/10 rounded-full blur-[120px]"
      />
      
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-amber-600/10 rounded-full blur-[150px]"
      />

      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.05, 0.15, 0.05],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-blue-500/10 rounded-full blur-[130px]"
      />

      {/* Floating Glassmorphism Orbs */}
      <motion.div
        animate={{
          y: [-30, 30, -30],
          x: [-20, 20, -20],
          rotate: [0, 45, 0],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[20%] left-[15%] w-64 h-64 md:w-96 md:h-96 rounded-full border border-white/5 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-xl shadow-[inset_0_0_40px_rgba(255,255,255,0.05),0_0_50px_rgba(234,179,8,0.1)]"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-full mix-blend-overlay" />
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-white/20 rounded-full blur-xl" />
      </motion.div>

      <motion.div
        animate={{
          y: [40, -40, 40],
          x: [30, -30, 30],
          rotate: [0, -45, 0],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[20%] right-[10%] w-48 h-48 md:w-72 md:h-72 rounded-full border border-white/5 bg-gradient-to-tl from-white/10 to-transparent backdrop-blur-xl shadow-[inset_0_0_30px_rgba(255,255,255,0.05),0_0_40px_rgba(217,119,6,0.1)]"
      >
        <div className="absolute inset-0 bg-gradient-to-bl from-white/10 to-transparent rounded-full mix-blend-overlay" />
        <div className="absolute top-[15%] right-[25%] w-[40%] h-[40%] bg-white/10 rounded-full blur-lg" />
      </motion.div>
      
      <motion.div
        animate={{
          y: [-50, 50, -50],
          x: [10, -10, 10],
          rotate: [0, 90, 0],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute top-[60%] left-[30%] w-32 h-32 md:w-48 md:h-48 rounded-full border border-white/5 bg-gradient-to-tr from-yellow-500/5 to-transparent backdrop-blur-xl shadow-[inset_0_0_20px_rgba(255,255,255,0.05),0_0_30px_rgba(245,158,11,0.1)] flex items-center justify-center opacity-80"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-100/10 to-transparent rounded-full mix-blend-overlay" />
        <div className="w-[50%] h-[50%] bg-amber-400/10 rounded-full blur-lg" />
      </motion.div>
      
      {/* Small floating bubble */}
      <motion.div
        animate={{
          y: [20, -20, 20],
          x: [-40, 40, -40],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-[15%] right-[35%] w-16 h-16 md:w-24 md:h-24 rounded-full border border-white/5 bg-white/5 backdrop-blur-md shadow-[inset_0_0_10px_rgba(255,255,255,0.05),0_0_20px_rgba(234,179,8,0.1)] opacity-70"
      >
         <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-white/20 rounded-full blur-md" />
      </motion.div>
    </div>
  );
}
