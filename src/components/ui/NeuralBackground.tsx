import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    let isDark = theme === 'dark';
    if (theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Define colors for dark mode lines and glow
    const lineColorBase = '250, 204, 21'; // Yellow-500
    const glowColorDark = 'rgba(250, 204, 21, 0.4)';

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;

      constructor() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        // Slow drifting movement
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        
        if (isDark) {
          this.radius = Math.random() * 1.5 + 0.5;
          this.opacity = 0.9;
        } else {
          // Different particle sizes for depth in light mode
          const depth = Math.random();
          this.radius = depth > 0.8 ? Math.random() * 5 + 3 : Math.random() * 2 + 1;
          this.opacity = depth > 0.8 ? 0.2 : 0.5;
          // Slower movement for bigger particles
          if (depth > 0.8) {
            this.vx *= 0.5;
            this.vy *= 0.5;
          }
        }
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around margins slightly
        if (this.x < -50) this.x = window.innerWidth + 50;
        if (this.x > window.innerWidth + 50) this.x = -50;
        if (this.y < -50) this.y = window.innerHeight + 50;
        if (this.y > window.innerHeight + 50) this.y = -50;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        if (isDark) {
          ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
          ctx.shadowBlur = 15;
          ctx.shadowColor = glowColorDark;
        } else {
          ctx.fillStyle = `rgba(230, 180, 60, ${this.opacity})`;
          ctx.shadowBlur = this.radius * 3;
          ctx.shadowColor = `rgba(240, 200, 80, ${this.opacity * 0.5})`;
        }
        
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    }

    const initParticles = () => {
      particles = [];
      const density = window.innerWidth > 1024 ? (isDark ? 90 : 60) : window.innerWidth > 768 ? 50 : 30; // Responsive density
      for (let i = 0; i < density; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        if (!isDark) continue; // No neural lines in light mode

        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const maxDistance = 160;
          if (distance < maxDistance) {
            ctx.beginPath();
            const opacity = 1 - (distance / maxDistance);
            ctx.strokeStyle = `rgba(${lineColorBase}, ${opacity * 0.3})`;
            ctx.lineWidth = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  const isActuallyDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // We are using fixed positioning with extremely z-index behind everything
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-gradient-to-br from-white via-[#fffbfa] to-[#fcf7ec] dark:from-[#080d19] dark:via-[#0c1325] dark:to-[#11192e] transition-colors duration-500">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block object-cover w-full h-full"
        style={{ opacity: isActuallyDark ? 0.8 : 0.7 }}
      />
      {/* Subtle extra glow orbits overlay if needed */}
      <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-amber-100/20 dark:bg-yellow-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[20%] left-[10%] w-[600px] h-[600px] bg-yellow-100/30 dark:bg-amber-500/5 blur-[150px] rounded-full animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
    </div>
  );
}
