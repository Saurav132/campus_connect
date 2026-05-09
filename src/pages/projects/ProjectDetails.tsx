import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot, getDoc, collection, query, where, addDoc, updateDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Project, ProjectRequest } from '../../types';
import { ArrowLeft, Users, Code, Wrench, MessageSquare, ShieldCheck, Loader2, Check, X, Trash2, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import JoinProjectModal from '../../components/projects/JoinProjectModal';
import ReportButton from '../../components/ReportButton';
import toast from 'react-hot-toast';

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRequests, setJoinRequests] = useState<ProjectRequest[]>([]);
  const [myRequest, setMyRequest] = useState<ProjectRequest | null>(null);

  const handleDeleteProject = async () => {
    if (!window.confirm("Are you sure you want to delete this team? This cannot be undone.")) return;
    if (!projectId) return;

    try {
      await deleteDoc(doc(db, 'projects', projectId));
      toast.success("Team deleted successfully");
      navigate('/projects');
    } catch (error) {
      toast.error("Failed to delete team");
    }
  };

  useEffect(() => {
    if (!projectId) return;

    const unsubProject = onSnapshot(doc(db, 'projects', projectId), (docSnap) => {
      if (docSnap.exists()) {
        setProject({ ...docSnap.data(), id: docSnap.id } as Project);
      } else {
        setProject(null);
      }
      setLoading(false);
    });

    const unsubRequests = onSnapshot(
      query(collection(db, 'projectRequests'), where('projectId', '==', projectId)),
      (snapshot) => {
        const reqs: ProjectRequest[] = [];
        snapshot.forEach(d => reqs.push({ ...d.data(), id: d.id } as ProjectRequest));
        setJoinRequests(reqs);
        if (userData?.uid) {
          // Get the most recent request
          const mine = reqs
            .filter(r => r.userId === userData.uid)
            .sort((a, b) => {
              const timeA = a.createdAt?.seconds || 0;
              const timeB = b.createdAt?.seconds || 0;
              return timeB - timeA;
            })[0];
          setMyRequest(mine || null);
        }
      }
    );

    return () => {
      unsubProject();
      unsubRequests();
    };
  }, [projectId, userData?.uid]);

  useEffect(() => {
    if (!project) return;
    
    // Fetch profiles for owner + members + requesters
    const uidsToFetch = new Set<string>();
    uidsToFetch.add(project.ownerId);
    project.members.forEach(id => uidsToFetch.add(id));
    joinRequests.forEach(r => uidsToFetch.add(r.userId));

    const fetchProfiles = async () => {
      const newProfiles: Record<string, any> = {};
      for (const uid of uidsToFetch) {
        if (!profiles[uid]) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            newProfiles[uid] = userDoc.data();
          }
        }
      }
      if (Object.keys(newProfiles).length > 0) {
        setProfiles(prev => ({ ...prev, ...newProfiles }));
      }
    };
    fetchProfiles();
  }, [project, joinRequests]); // eslint-disable-line

  const handleJoinRequest = async (message: string) => {
    if (!userData?.uid || !project?.id) return;
    try {
      await addDoc(collection(db, 'projectRequests'), {
        projectId: project.id,
        userId: userData.uid,
        message,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      // Notification to owner
      await addDoc(collection(db, 'notifications'), {
        userId: project.ownerId,
        senderId: userData.uid,
        type: 'project_join_request',
        contextId: project.id,
        read: false,
        createdAt: serverTimestamp()
      });
      setShowJoinModal(false);
      toast.success('Request sent successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to send request');
    }
  };

  const handleDismissRequest = async () => {
    if (!myRequest?.id) return;
    if (!window.confirm("Are you sure you want to withdraw your request?")) return;
    try {
      await deleteDoc(doc(db, 'projectRequests', myRequest.id));
      toast.success("Request withdrawn");
    } catch (error) {
      toast.error("Failed to withdraw request");
    }
  };

  const handleAcceptRequest = async (req: ProjectRequest) => {
    if (!project?.id) return;
    
    // Check member limit
    const currentMemberCount = project.members?.length || 0;
    const maxMembers = project.maxMembers || 5;
    
    if (currentMemberCount >= maxMembers) {
      toast.error("Team is already full");
      return;
    }

    try {
      await updateDoc(doc(db, 'projectRequests', req.id!), { 
        status: 'accepted',
        updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'projects', project.id), {
        members: [...(project.members || []), req.userId]
      });
      // Update team chat participants if it exists
      const chatId = `project_${project.id}`;
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        await updateDoc(doc(db, 'chats', chatId), {
          participants: [...(project.members || []), req.userId]
        });
      }

      await addDoc(collection(db, 'notifications'), {
        userId: req.userId,
        senderId: userData!.uid,
        type: 'project_request_accepted',
        contextId: project.id,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
       console.error(error);
       toast.error("Failed to accept request");
    }
  };

  const handleRejectRequest = async (req: ProjectRequest) => {
    try {
      await updateDoc(doc(db, 'projectRequests', req.id!), { 
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'notifications'), {
        userId: req.userId,
        senderId: userData!.uid,
        type: 'project_request_rejected',
        contextId: project?.id,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error(error);
    }
  };

  const openTeamChat = async () => {
    if (!project?.id || !userData?.uid) return;
    try {
      const chatId = `project_${project.id}`;
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      
      if (!chatDoc.exists()) {
        await setDoc(doc(db, 'chats', chatId), {
          type: 'project',
          projectId: project.id,
          participants: project.members, 
          contextType: 'project',
          contextId: project.id,
          contextTitle: project.title,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'chats', chatId), {
          participants: project.members,
          updatedAt: serverTimestamp()
        });
      }
      navigate(`/messages/${chatId}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to open team chat");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-xl font-semibold">Team not found</div>
        <button onClick={() => navigate('/projects')} className="text-[var(--accent)] hover:underline">Go back</button>
      </div>
    );
  }

  const isOwner = userData?.uid === project.ownerId;
  const isMember = project.members.includes(userData?.uid || '');
  const owner = profiles[project.ownerId];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Header */}
        <div>
          <button 
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-foreground mb-6 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Teams
          </button>
          
          {myRequest && myRequest.status === 'pending' && !isMember && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400">
                <Info className="w-5 h-5" />
                <span className="text-sm font-medium">Your request to join this team has been sent and is currently pending review.</span>
              </div>
              <button 
                onClick={handleDismissRequest}
                className="text-xs font-bold text-red-500 hover:underline uppercase tracking-wider"
              >
                Cancel Request
              </button>
            </div>
          )}
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{project.title}</h1>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                  project.status === 'open' ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                  project.status === 'completed' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                  "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]"
                )}>
                  {project.status}
                </span>
                <ReportButton targetId={project.id!} targetType="project" />
              </div>
              <p className="text-lg text-[var(--text-secondary)] max-w-3xl leading-relaxed">
                {project.description}
              </p>
            </div>
            
            <div className="flex shrink-0 gap-3">
              {(isOwner || userData?.role === 'admin') && (
                <button 
                  onClick={handleDeleteProject}
                  className="flex items-center justify-center p-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  title="Delete Project"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              {isMember ? (
                <button 
                  onClick={openTeamChat}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-black font-semibold rounded-xl hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/20"
                >
                  <MessageSquare className="w-5 h-5" />
                  Team Chat
                </button>
              ) : myRequest ? (
                <div className="flex items-center gap-2">
                  <button 
                    disabled
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold rounded-xl border border-[var(--card-border)] opacity-70"
                  >
                    {myRequest.status === 'pending' ? 'Request Pending' : 
                     myRequest.status === 'accepted' ? 'Accepted' : 'Declined'}
                  </button>
                  {myRequest.status === 'pending' && (
                    <button 
                      onClick={handleDismissRequest}
                      className="px-4 py-2.5 bg-red-500/10 text-red-500 font-semibold rounded-xl border border-red-500/20 hover:bg-red-50 hover:text-white transition-all text-sm"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ) : project.members?.length >= (project.maxMembers || 5) ? (
                <button 
                  disabled
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold rounded-xl border border-[var(--card-border)] opacity-70"
                >
                  Team Full
                </button>
              ) : (
                <button 
                  onClick={() => setShowJoinModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-black font-semibold rounded-xl hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/20"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Request to Join
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Code className="w-5 h-5 text-[var(--accent)]" /> Technologies
              </h2>
              <div className="flex flex-wrap gap-2">
                {project.technologies?.map((tech, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--card-border)] text-sm font-medium">
                    {tech}
                  </span>
                ))}
                {!project.technologies?.length && <span className="text-[var(--text-secondary)]">Not specified</span>}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 md:p-8">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[var(--accent)]" /> Required Skills & Roles
              </h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Roles</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.roles?.map((role, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-sm font-medium">
                        {role}
                      </span>
                    ))}
                    {!project.roles?.length && <span className="text-[var(--text-secondary)] text-sm">Any role</span>}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.skills?.map((skill, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--card-border)] text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Owner specific section: Pending Requests */}
            {isOwner && joinRequests.filter(r => r.status === 'pending').length > 0 && (
              <div className="glass-card rounded-2xl p-6 md:p-8 border-l-4 border-[var(--accent)]">
                <h2 className="text-xl font-bold mb-4">Pending Requests ({joinRequests.filter(r => r.status === 'pending').length})</h2>
                <div className="space-y-4">
                  {joinRequests.filter(r => r.status === 'pending').map(req => {
                    const reqProfile = profiles[req.userId];
                    return (
                      <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--card-border)]">
                        <div className="flex items-start gap-3">
                          <img 
                            src={reqProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(reqProfile?.displayName || 'User')}&background=random`} 
                            alt="avatar" 
                            className="w-10 h-10 rounded-full object-cover"
                            onClick={() => navigate(`/profile/${req.userId}`)}
                          />
                          <div>
                            <div className="font-semibold hover:text-[var(--accent)] cursor-pointer" onClick={() => navigate(`/profile/${req.userId}`)}>
                              {reqProfile?.displayName || 'User'}
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] mt-1 italic">"{req.message || 'No message provided'}"</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handleAcceptRequest(req)} className="p-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-lg transition-colors" title="Accept">
                            <Check className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleRejectRequest(req)} className="p-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg transition-colors" title="Reject">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--accent)]" /> Team Members
              </h2>
              <div className="space-y-4">
                {project.members.map(memberId => {
                  const p = profiles[memberId];
                  const isProjOwner = memberId === project.ownerId;
                  return (
                    <div key={memberId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer group" onClick={() => navigate(`/profile/${memberId}`)}>
                      <img 
                        src={p?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p?.displayName || 'User')}&background=random`} 
                        alt="member" 
                        className="w-10 h-10 rounded-full object-cover border border-[var(--card-border)] group-hover:border-[var(--accent)] transition-colors"
                      />
                      <div>
                        <div className="font-medium text-sm group-hover:text-[var(--accent)] transition-colors flex items-center gap-2">
                          {p?.displayName || 'Loading...'}
                          {isProjOwner && <span className="text-[9px] uppercase tracking-wide bg-[var(--accent)]/20 text-[var(--accent-hover)] px-1.5 py-0.5 rounded">Owner</span>}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] capitalize">{p?.role || 'User'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Created info */}
            <div className="text-xs text-[var(--text-secondary)] text-center">
              Team created on {project.createdAt?.toDate ? project.createdAt.toDate().toLocaleDateString() : 'recently'}
            </div>
          </div>
        </div>
      </div>

      {showJoinModal && (
        <JoinProjectModal 
          project={project} 
          onClose={() => setShowJoinModal(false)} 
          onSubmit={handleJoinRequest} 
        />
      )}
    </div>
  );
}
