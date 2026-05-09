import React from 'react';
import { motion, useAnimation, useInView } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Sparkles, ArrowRight, Shield, Zap, Users, GraduationCap, Code } from 'lucide-react';
import NeuralBackground from '../components/ui/NeuralBackground';
import FloatingOrbs from '../components/ui/FloatingOrbs';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="dark min-h-screen bg-slate-950 text-white relative overflow-hidden font-sans">
      {/* Background Animation */}
      <div className="absolute inset-0 z-0">
        <NeuralBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-slate-950/80 to-slate-950 z-10 pointer-events-none" />
        <FloatingOrbs />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 px-6 py-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6 text-black" />
          </div>
          <span className="text-xl font-black tracking-tight text-white drop-shadow-md group-hover:text-amber-400 transition-colors">Campus Connect AI</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden md:flex text-gray-300 hover:text-white" onClick={() => navigate('/login')}>
            Log In
          </Button>
          <Button variant="primary" className="glow-yellow font-bold text-black" onClick={handleGetStarted}>
            {user ? 'Go to Dashboard' : 'Get Started'}
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-20 px-6 md:px-12 pt-24 md:pt-40 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-sm font-semibold mb-8 backdrop-blur-md"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Campus Network</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-8 bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-gray-500 max-w-4xl"
        >
          Connect, Learn, and Grow with <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">Your Campus.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12"
        >
          The ultimate platform for students and alumni to collaborate on projects, find mentors, and discover career opportunities using AI.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleGetStarted}
            className="w-full sm:w-auto text-lg h-14 px-8 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.4)] group overflow-hidden relative"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 opacity-90 group-hover:opacity-100 transition-opacity"></span>
            <span className="relative flex items-center text-black font-bold">
              {user ? 'Enter Dashboard' : 'Join the Network'}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
          
          {!user && (
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto text-lg h-14 px-8 rounded-full border-gray-700 bg-black/40 hover:bg-black/60 backdrop-blur-md"
            >
              Sign In
            </Button>
          )}
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full text-left"
        >
          {[
            {
              icon: Users,
              title: "Alumni Network",
              description: "Connect instantly with verified alumni working in top tech companies.",
              color: "text-blue-400",
              bg: "bg-blue-500/10",
              border: "border-blue-500/20"
            },
            {
              icon: Code,
              title: "Project Collaboration",
              description: "Find the perfect team for your next hackathon or startup idea.",
              color: "text-purple-400",
              bg: "bg-purple-500/10",
              border: "border-purple-500/20"
            },
            {
              icon: Zap,
              title: "AI-Powered Mentorship",
              description: "Get personalized guidance, resume reviews, and career paths.",
              color: "text-amber-400",
              bg: "bg-amber-500/10",
              border: "border-amber-500/20"
            }
          ].map((feature, i) => (
            <div key={i} className={`p-8 rounded-[32px] glass-card border ${feature.border} relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
              <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 border-t border-white/10 mt-32 bg-black/40 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/dashboard')}>
            <GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-amber-400 transition-colors" />
            <span className="text-gray-400 font-semibold tracking-tight group-hover:text-white transition-colors">Campus Connect AI</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500 font-medium">
            <a href="#" className="hover:text-amber-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-amber-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-amber-400 transition-colors">Guidelines</a>
          </div>
          <div className="text-sm text-gray-600">
            © 2026 Campus Connect AI.
          </div>
        </div>
      </footer>
    </div>
  );
}
