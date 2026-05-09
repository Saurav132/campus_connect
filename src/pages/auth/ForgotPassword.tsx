import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Sparkles, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword(email);
      toast.success('Password reset email sent! Check your inbox.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full relative overflow-hidden backdrop-blur-2xl bg-[var(--card-bg)]/80 sm:bg-[var(--card-bg)] border-[var(--card-border)] shadow-xl">
      <CardHeader className="space-y-3 pb-6 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
          className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-2 text-yellow-500"
        >
          <Sparkles className="w-6 h-6" />
        </motion.div>
        <CardTitle className="text-3xl font-bold tracking-tight">Reset Password</CardTitle>
        <CardDescription className="text-base">
          Enter your email to receive a password reset link
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                id="email"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full font-semibold relative flex items-center justify-center bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)]"
            isLoading={isLoading}
          >
            Send Reset Link
          </Button>
        </form>

        <div className="text-center mt-6">
          <Link to="/login" className="inline-flex items-center text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
