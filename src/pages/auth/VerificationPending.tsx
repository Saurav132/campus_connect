import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { ShieldAlert, Clock, LogOut, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function VerificationPending() {
  const { userData, logout, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && userData?.verificationStatus === 'verified') {
      navigate('/dashboard');
    }
  }, [userData, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const getStatusContent = () => {
    switch (userData?.verificationStatus) {
      case 'rejected':
        return {
          icon: <XCircle className="w-16 h-16 text-red-500" />,
          title: "Verification Rejected",
          description: "Unfortunately, your ID proof was not accepted. Please contact support or try signing up again with a valid document.",
          color: "text-red-500"
        };
      case 'verified':
        return {
          icon: <CheckCircle2 className="w-16 h-16 text-emerald-500" />,
          title: "Verification Approved!",
          description: "Your account has been verified. You can now access the full campus connect experience.",
          color: "text-emerald-500"
        };
      default:
        return {
          icon: <Clock className="w-16 h-16 text-yellow-500" />,
          title: "Verification Pending",
          description: "Your profile is being reviewed by the administration. This usually takes 24-48 hours. We'll notify you once you're verified.",
          color: "text-yellow-500"
        };
    }
  };

  const status = getStatusContent();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-8 text-center shadow-xl"
      >
        <div className="flex justify-center mb-6">
           <div className="p-4 rounded-2xl bg-[var(--bg-secondary)]">
             {status.icon}
           </div>
        </div>
        
        <h1 className={`text-2xl font-bold mb-4 ${status.color}`}>{status.title}</h1>
        
        <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
          {status.description}
        </p>

        <div className="space-y-3">
          {userData?.verificationStatus === 'verified' ? (
            <Button className="w-full" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          ) : (
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 text-orange-500 text-sm mb-6">
              Wait for your request to be accepted by the admin.
            </div>
          )}
          
          <Button variant="ghost" className="w-full text-[var(--text-secondary)] hover:bg-[var(--accent)]/5" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign in with different account
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
