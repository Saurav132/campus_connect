import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, orderBy, onSnapshot, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Project } from '../../types';
import { Plus, Filter, Users, X, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import CreateProjectModal from '../../components/projects/CreateProjectModal';

export default function Projects() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ownerProfiles, setOwnerProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const projs: Project[] = [];
      const newOwnerIds = new Set<string>();

      snapshot.forEach(doc => {
        const data = doc.data() as Project;
        projs.push({ ...data, id: doc.id });
        if (data.ownerId && !ownerProfiles[data.ownerId]) {
          newOwnerIds.add(data.ownerId);
        }
      });
      
      setProjects(projs);
      setLoading(false);

      if (newOwnerIds.size > 0) {
        const fetchProfiles = async () => {
          const profiles: Record<string, any> = {};
          for (const uid of newOwnerIds) {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              profiles[uid] = userDoc.data();
            }
          }
          setOwnerProfiles(prev => ({ ...prev, ...profiles }));
        };
        fetchProfiles();
      }
    });

    return () => unsubscribe();
  }, []); // Remove ownerProfiles to stop infinite loop

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Finder</h1>
          <p className="text-[var(--text-secondary)] mt-1">Discover projects and find your next team.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-black font-semibold rounded-xl hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Team
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
             <div key={i} className="glass-card rounded-2xl p-6 h-[260px] animate-pulse flex flex-col border-transparent">
               <div className="flex items-start justify-between mb-4">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10" />
                   <div className="space-y-2">
                     <div className="w-32 h-4 bg-black/10 dark:bg-white/10 rounded-md" />
                     <div className="w-20 h-3 bg-black/10 dark:bg-white/10 rounded-md" />
                   </div>
                 </div>
                 <div className="w-16 h-6 rounded-full bg-black/10 dark:bg-white/10" />
               </div>
               <div className="space-y-2 mb-6">
                 <div className="w-full h-4 bg-black/10 dark:bg-white/10 rounded-md" />
                 <div className="w-4/5 h-4 bg-black/10 dark:bg-white/10 rounded-md" />
               </div>
               <div className="mt-auto pt-4 flex gap-2 border-t border-[var(--card-border)]/50">
                 <div className="w-16 h-6 rounded-md bg-black/5 dark:bg-white/5" />
                 <div className="w-16 h-6 rounded-md bg-black/5 dark:bg-white/5" />
               </div>
             </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project, i) => {
            const owner = ownerProfiles[project.ownerId];
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="glass-card rounded-2xl p-6 cursor-pointer hover:border-[var(--card-border-hover)] transition-all group hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={owner?.photoURL || 'https://www.gravatar.com/avatar/0?d=mp'} 
                      alt="Owner"
                      className="w-10 h-10 rounded-full object-cover border border-[var(--card-border)]"
                    />
                    <div>
                      <h3 className="font-semibold text-base line-clamp-1 group-hover:text-[var(--accent)] transition-colors">{project.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)]">by {owner?.displayName || 'Loading...'}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium capitalize shrink-0",
                    project.status === 'open' ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                    project.status === 'completed' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                    "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]"
                  )}>
                    {project.status === 'open' ? (
                      <span>{project.members?.length || 1} / {project.maxMembers || 5}</span>
                    ) : project.status}
                  </div>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-6 line-clamp-2 min-h-[40px]">
                  {project.description}
                </p>

                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {project.skills.slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] text-xs font-medium border border-[var(--card-border)]">
                        {skill}
                      </span>
                    ))}
                    {project.skills.length > 3 && (
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] text-xs font-medium border border-[var(--card-border)]">
                        +{project.skills.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]/50">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Users className="w-4 h-4" />
                    <span>{project.members?.length || 1} members</span>
                  </div>
                  <div className="text-sm font-medium text-[var(--accent)]">
                    View Team
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {filteredProjects.length === 0 && (
            <div className="col-span-full py-20 text-center text-[var(--text-secondary)]">
              <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--card-border)]">
                <Users className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-lg font-medium text-[var(--text-primary)]">No projects found</p>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
