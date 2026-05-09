import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Sparkles, Mail, Lock, User, Briefcase, FileCheck, Upload, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function Signup() {
  const { signInWithGoogle, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [idProof, setIdProof] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit
      toast.error('File size too large. Please upload an image under 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => setIsUploading(true);
    reader.onloadend = () => {
      setIdProof(reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();
      const user = result.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create profile if it doesn't exist
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: role, // Use selected role from form
          verificationStatus: 'verified',
          idProofUrl: idProof,
          createdAt: new Date().toISOString()
        });
        toast.success('Account created successfully!');
      } else {
        toast.success('Welcome back!');
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword || !role) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    // Strong password validation
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast.error('Password must contain uppercase, lowercase, and numbers');
      return;
    }

    try {
      setIsEmailLoading(true);
      await signUpWithEmail(email, password, name, role, idProof);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
         toast.error('Email is already registered. Please log in.');
      } else {
         toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <Card className="w-full relative overflow-hidden backdrop-blur-2xl bg-[var(--card-bg)]/80 sm:bg-[var(--card-bg)] border-[var(--card-border)] shadow-xl mt-8">
      <CardHeader className="space-y-3 pb-6 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
          className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-2 text-yellow-500"
        >
          <Sparkles className="w-6 h-6" />
        </motion.div>
        <CardTitle className="text-3xl font-bold tracking-tight">Create an account</CardTitle>
        <CardDescription className="text-base">
          Join your campus network to connect and grow
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                id="name"
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
                disabled={isEmailLoading || isLoading}
              />
            </div>
          </div>

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
            <label htmlFor="role" className="text-sm font-medium">I am a...</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <select 
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all appearance-none"
                disabled={isEmailLoading || isLoading}
              >
                <option value="student">Student</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Upload ID Proof (Marksheet/ID Card/Degree)</label>
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="id-proof-upload"
                disabled={isEmailLoading || isLoading || isUploading}
              />
              <label 
                htmlFor="id-proof-upload"
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--bg-primary)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 cursor-pointer transition-all ${idProof ? 'border-green-500/50 bg-green-500/5' : ''}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${idProof ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : idProof ? <FileCheck className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{idProof ? 'ID Proof Uploaded' : 'Select ID Proof'}</p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">JPG, PNG up to 1MB</p>
                </div>
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
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
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  id="confirmPassword"
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
                  disabled={isEmailLoading || isLoading}
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full font-semibold relative flex items-center justify-center bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] mt-2"
            isLoading={isEmailLoading}
            disabled={isLoading}
          >
            Create Account
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
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Google
        </Button>

        <div className="text-center text-sm text-[var(--text-secondary)] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-yellow-600 dark:text-yellow-500 hover:underline">
            Log in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
