import React, { useState } from 'react';
import { Flag, X, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface ReportButtonProps {
  targetId: string;
  targetType: 'post' | 'comment' | 'user' | 'resource' | 'opportunity' | 'event' | 'project';
  className?: string;
}

export default function ReportButton({ targetId, targetType, className }: ReportButtonProps) {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) {
      toast.error('Please login to report content');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        targetId,
        targetType,
        reason,
        reportedBy: userData.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Report submitted. Thank you for keeping the community safe.');
      setIsOpen(false);
      setReason('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        className={`p-1.5 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors ${className}`}
        title="Report content"
      >
        <Flag className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-primary)] border border-[var(--card-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                   <AlertCircle className="w-5 h-5 text-red-500" />
                   <h3 className="text-xl font-bold">Report {targetType}</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Why are you reporting this?
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide details about the violation..."
                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-red-500 focus:outline-none transition-all h-32 resize-none"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
