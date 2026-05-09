import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Sparkles, Mail, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';

export default function Login() {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // User not registered, sign out and redirect
        await signOut(auth);
        toast.error('Account not found. Please sign up first.');
        navigate('/signup');
      } else {
        toast.success('Successfully logged in!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found' || error.message?.includes('user-not-found')) {
        toast.error('Account not found. Please sign up first.');
        navigate('/signup');
      } else {
        toast.error(error.message || 'Failed to sign in with Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setIsEmailLoading(true);
      await signInWithEmail(email, password);
      toast.success('Successfully logged in!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      // Clean up firebase error message
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
         toast.error('Account not found or invalid credentials. If you are new, please sign up.');
         if (error.code === 'auth/user-not-found') navigate('/signup');
      } else {
         toast.error(error.message || 'Failed to sign in');
      }
    } finally {
      setIsEmailLoading(false);
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
        <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription className="text-base">
          Sign in to your Campus Connect AI account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        <form onSubmit={handleEmailSignIn} className="space-y-4">
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
                disabled={isEmailLoading || isLoading}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Link to="/forgot-password" className="text-sm text-[var(--accent)] hover:underline font-medium">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                id="password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
                disabled={isEmailLoading || isLoading}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full font-semibold relative flex items-center justify-center bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)]"
            isLoading={isEmailLoading}
            disabled={isLoading}
          >
            Sign in
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--card-border)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--card-bg)] px-2 text-[var(--text-tertiary)]">
              Or continue with
            </span>
          </div>
        </div>

        <Button 
          variant="secondary" 
          size="lg" 
          type="button"
          className="w-full font-semibold relative flex items-center justify-center gap-3 bg-white dark:bg-[#1a1f2e] hover:bg-gray-50 dark:hover:bg-[#252b3d] border-gray-200 dark:border-gray-800"
          onClick={handleGoogleSignIn}
          isLoading={isLoading}
          disabled={isEmailLoading}
        >
          {!isLoading && (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.93C17.67 15.63 16.89 16.8 15.72 17.58V20.35H19.28C21.36 18.43 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23C14.97 23 17.46 22.02 19.28 20.35L15.72 17.58C14.74 18.24 13.48 18.64 12 18.64C9.13 18.64 6.7 16.7 5.82 14.12H2.15V16.97C3.96 20.57 7.69 23 12 23Z" fill="#34A853"/>
              <path d="M5.82 14.12C5.59 13.46 5.46 12.74 5.46 12C5.46 11.26 5.59 10.54 5.82 9.88V7.03H2.15C1.41 8.5 1 10.19 1 12C1 13.81 1.41 15.5 2.15 16.97L5.82 14.12Z" fill="#FBBC05"/>
              <path d="M12 5.36C13.62 5.36 15.06 5.92 16.2 7.02L19.38 3.84C17.45 2.05 14.97 1 12 1C7.69 1 3.96 3.43 2.15 7.03L5.82 9.88C6.7 7.3 9.13 5.36 12 5.36Z" fill="#EA4335"/>
            </svg>
          )}
          Google
        </Button>

        <div className="text-center text-sm text-[var(--text-secondary)] mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-yellow-600 dark:text-yellow-500 hover:underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
