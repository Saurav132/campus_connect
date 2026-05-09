import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  onClose: () => void;
}

export default function CreateProjectModal({ onClose }: Props) {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    technologies: '',
    roles: '',
    skills: '',
    maxMembers: '5'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.uid) return;
    
    setLoading(true);
    try {
      const splitAndTrim = (str: string) => str.split(',').map(s => s.trim()).filter(Boolean);
      
      const newProject = {
        title: formData.title,
        description: formData.description,
        technologies: splitAndTrim(formData.technologies),
        roles: splitAndTrim(formData.roles),
        skills: splitAndTrim(formData.skills),
        maxMembers: parseInt(formData.maxMembers) || 5,
        ownerId: userData.uid,
        members: [userData.uid],
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'projects'), newProject);
      onClose();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project");
    } finally {
      setLoading(false);
    }
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
        className="relative w-full max-w-2xl glass-card rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--card-border)]">
          <div>
            <h2 className="text-xl font-bold">Create New Team</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Start a team and bring your idea to life</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="createProjectForm" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Team Title</label>
              <input 
                required
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. AI-Powered Study Assistant"
                className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea 
                required
                rows={4}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="What are you building? Why is it interesting?"
                className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Required Skills (comma separated)</label>
              <input 
                required
                type="text"
                value={formData.skills}
                onChange={e => setFormData({ ...formData, skills: e.target.value })}
                placeholder="e.g. React, Node.js, Python, UI/UX"
                className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Open Roles (comma separated)</label>
              <input 
                required
                type="text"
                value={formData.roles}
                onChange={e => setFormData({ ...formData, roles: e.target.value })}
                placeholder="e.g. Frontend Developer, Backend Developer, Designer"
                className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Technologies (comma separated)</label>
              <input 
                type="text"
                value={formData.technologies}
                onChange={e => setFormData({ ...formData, technologies: e.target.value })}
                placeholder="e.g. Next.js, Firebase, OpenAI"
                className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Team Size Limit</label>
              <input 
                type="number"
                min="2"
                max="50"
                value={formData.maxMembers}
                onChange={e => setFormData({ ...formData, maxMembers: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-[var(--card-border)] bg-[var(--bg-secondary)]/50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-medium hover:bg-[var(--card-border)] transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="createProjectForm"
            disabled={loading}
            className="px-6 py-2.5 bg-[var(--accent)] text-black font-semibold rounded-xl hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Team'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
