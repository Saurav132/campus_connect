import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Project } from '../../types';

interface Props {
  project: Project;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

export default function JoinProjectModal({ project, onClose, onSubmit }: Props) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg glass-card rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--card-border)]">
          <div>
            <h2 className="text-xl font-bold">Join Project</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Request to join {project.title}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Message (Optional)</label>
            <textarea 
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Introduce yourself and explain why you're a good fit..."
              className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-medium hover:bg-[var(--card-border)] transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-[var(--accent)] text-black font-semibold rounded-xl hover:bg-[var(--accent-hover)] transition-colors"
            >
              Send Request
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
