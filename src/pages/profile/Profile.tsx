import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Card, CardContent } from '../../components/ui/Card';
import { BackButton } from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { User, MapPin, Mail, Calendar, Edit3, Briefcase, GraduationCap, Github, Linkedin, Link, Loader2, UserPlus, UserCheck, UserX, Clock, MessageSquare, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { EditProfileModal } from '../../components/profile/EditProfileModal';
import { sendConnectionRequest, acceptConnectionRequest, rejectConnectionRequest, removeConnection, Connection } from '../../services/connectionService';

import { formatDistanceToNow } from 'date-fns';
import ReportButton from '../../components/ReportButton';
import toast from 'react-hot-toast';

interface ProfileData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  coverImage?: string;
  role: 'student' | 'alumni' | 'mentor' | 'admin';
  department?: string;
  passOutYear?: string;
  yearOfStudy?: string;
  company?: string;
  position?: string;
  bio?: string;
  skills?: string[];
  github?: string;
  linkedin?: string;
  openToOpportunities?: boolean;
  createdAt?: string;
}

export default function Profile() {
  const { userId } = useParams();
  const { userData: currentUserData } = useAuth();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<Connection | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState<{id: string, content: string, createdAt: number, type: string}[]>([]);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);

  const isOwnProfile = currentUserData?.uid === userId;

  const fetchProfile = async () => {
    if (!userId) return;
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfileData(docSnap.data() as ProfileData);
      } else {
        setError('User not found');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (!userId || !currentUserData?.uid || isOwnProfile) return;

    // Real-time listener for connection status between current user and profile user
    const q1 = query(
      collection(db, 'connections'),
      where('fromUserId', '==', currentUserData.uid),
      where('toUserId', '==', userId)
    );
    const q2 = query(
      collection(db, 'connections'),
      where('fromUserId', '==', userId),
      where('toUserId', '==', currentUserData.uid)
    );

    const handleSnap = (snapshot: any) => {
      let foundConnection = null;
      snapshot.forEach((doc: any) => {
        foundConnection = { id: doc.id, ...doc.data() as Connection };
      });
      if (foundConnection) {
        setConnectionStatus(foundConnection as any);
      } else {
        // Only set null if BOTH queries are empty. We'd have to manage that state carefully.
        // Actually since we combine them, we'll keep a ref or state of both.
      }
    };
    
    // Better way to handle both
    let docs1: any[] = [];
    let docs2: any[] = [];
    
    const updateCombined = () => {
      const all = [...docs1, ...docs2];
      if (all.length > 0) {
        setConnectionStatus(all[0]);
      } else {
        setConnectionStatus(null);
      }
    };

    const unsubscribe1 = onSnapshot(q1, (snap) => {
      docs1 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateCombined();
    });
    const unsubscribe2 = onSnapshot(q2, (snap) => {
      docs2 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateCombined();
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [userId, currentUserData, isOwnProfile]);

  useEffect(() => {
    if (!userId) return;

    let allActivities: Map<string, {id: string; content: string; createdAt: number; type: string}> = new Map();

    const updateActivities = () => {
      const activitiesList = Array.from(allActivities.values());
      activitiesList.sort((a, b) => b.createdAt - a.createdAt);
      setRecentActivities(activitiesList);
    };

    const unsubFeed = onSnapshot(query(collection(db, 'feed_posts'), where('userId', '==', userId)), (snapshot) => {
      snapshot.forEach(doc => {
        const data = doc.data();
        let ts = Date.now();
        if (data.createdAt?.toMillis) ts = data.createdAt.toMillis();
        else if (typeof data.createdAt === 'number') ts = data.createdAt;
        else if (typeof data.createdAt === 'string') ts = new Date(data.createdAt).getTime() || Date.now();
        
        allActivities.set(doc.id, { id: doc.id, content: `Posted: ${data.content || ''}`, createdAt: ts, type: 'post' });
      });
      const currentIds = new Set(snapshot.docs.map(d => d.id));
      for (const [id, act] of allActivities.entries()) {
        if (act.type === 'post' && !currentIds.has(id)) allActivities.delete(id);
      }
      updateActivities();
    });

    const unsubProjects = onSnapshot(query(collection(db, 'projects'), where('ownerId', '==', userId)), (snapshot) => {
      snapshot.forEach(doc => {
        const data = doc.data();
        let ts = Date.now();
        if (data.createdAt?.toMillis) ts = data.createdAt.toMillis();
        else if (typeof data.createdAt === 'number') ts = data.createdAt;
        else if (typeof data.createdAt === 'string') ts = new Date(data.createdAt).getTime() || Date.now();
        
        allActivities.set(doc.id, { id: doc.id, content: `Started team: ${data.title || ''}`, createdAt: ts, type: 'project' });
      });
      
      const currentIds = new Set(snapshot.docs.map(d => d.id));
      for (const [id, act] of allActivities.entries()) {
        if (act.type === 'project' && !currentIds.has(id)) allActivities.delete(id);
      }
      setProjectsCount(snapshot.docs.length);
      updateActivities();
    });

    const unsubResources = onSnapshot(query(collection(db, 'resources'), where('uploadedBy', '==', userId)), (snapshot) => {
      snapshot.forEach(doc => {
         const data = doc.data();
        let ts = Date.now();
        if (data.createdAt?.toMillis) ts = data.createdAt.toMillis();
        else if (typeof data.createdAt === 'number') ts = data.createdAt;
        else if (typeof data.createdAt === 'string') ts = new Date(data.createdAt).getTime() || Date.now();
        
        allActivities.set(doc.id, { id: doc.id, content: `Shared resource: ${data.title || ''}`, createdAt: ts, type: 'resource' });
      });
      const currentIds = new Set(snapshot.docs.map(d => d.id));
      for (const [id, act] of allActivities.entries()) {
        if (act.type === 'resource' && !currentIds.has(id)) allActivities.delete(id);
      }
      updateActivities();
    });

    return () => {
      unsubFeed();
      unsubProjects();
      unsubResources();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    let fromAccepted = new Set();
    let toAccepted = new Set();

    const syncConnections = () => {
      setConnectionsCount(fromAccepted.size + toAccepted.size);
    };

    const unsubConnsFrom = onSnapshot(
      query(collection(db, 'connections'), where('fromUserId', '==', userId), where('status', '==', 'accepted')),
      (snapshot) => {
        fromAccepted = new Set(snapshot.docs.map(d => d.id));
        syncConnections();
      }
    );

    const unsubConnsTo = onSnapshot(
      query(collection(db, 'connections'), where('toUserId', '==', userId), where('status', '==', 'accepted')),
      (snapshot) => {
        toAccepted = new Set(snapshot.docs.map(d => d.id));
        syncConnections();
      }
    );

    return () => {
      unsubConnsFrom();
      unsubConnsTo();
    };
  }, [userId]);

  const handleConnect = async () => {
    if (!currentUserData?.uid || !userId) return;
    setActionLoading(true);
    try {
      await sendConnectionRequest(currentUserData.uid, userId);
    } catch (error) {
      console.error(error);
      alert('Could not send networking request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!connectionStatus?.id || !userId || !currentUserData?.uid) return;
    setActionLoading(true);
    try {
      await acceptConnectionRequest(connectionStatus.id, currentUserData.uid, userId);
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action: 'reject' | 'remove') => {
    if (!connectionStatus?.id) return;
    setActionLoading(true);
    try {
      if (action === 'reject') {
        await rejectConnectionRequest(connectionStatus.id);
        toast.success("Request rejected");
      } else {
        await removeConnection(connectionStatus.id);
        setConnectionStatus(null);
        toast.success("Connection removed");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUserData?.uid || !userId) return;
    
    // Check if connected
    if (!connectionStatus || connectionStatus.status !== 'accepted') {
      toast.error('You can only message users you are connected with.');
      return;
    }

    try {
      // Find existing direct chat
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', currentUserData.uid)
      );
      const snapshot = await getDocs(q);
      let existingChatId = null;
      
      snapshot.forEach(d => {
        const data = d.data();
        if (data.participants.includes(userId)) {
          existingChatId = d.id;
        }
      });

      if (existingChatId) {
        navigate(`/messages/${existingChatId}`);
      } else {
        const newChatRef = await addDoc(collection(db, 'chats'), {
          type: 'direct',
          participants: [currentUserData.uid, userId],
          contextTitle: ['mentor', 'alumni'].includes(profileData.role) ? 'Mentorship' : undefined,
          contextType: ['mentor', 'alumni'].includes(profileData.role) ? 'mentorship' : undefined,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        navigate(`/messages/${newChatRef.id}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const renderConnectionButton = () => {
    if (isOwnProfile || currentUserData?.role === 'admin') {
      return (
        <Button variant="outline" className="w-full sm:w-auto font-semibold" onClick={() => setIsEditModalOpen(true)}>
          <Edit3 className="w-4 h-4 mr-2" />
          {isOwnProfile ? 'Edit Profile' : 'Manage Profile'}
        </Button>
      );
    }

    if (actionLoading) {
      return (
        <Button variant="primary" className="w-full sm:w-auto" disabled>
          <Loader2 className="w-4 h-4 animate-spin" />
        </Button>
      );
    }

    if (!connectionStatus) {
      return (
        <Button variant="primary" className="w-full sm:w-auto font-semibold" onClick={handleConnect}>
          <UserPlus className="w-4 h-4 mr-2" /> Connect
        </Button>
      );
    }

    if (connectionStatus.status === 'accepted') {
      return (
        <Button variant="secondary" className="w-full sm:w-auto font-semibold group flex items-center" onClick={() => handleAction('remove')}>
          <UserCheck className="w-4 h-4 mr-2 text-green-500 group-hover:hidden" />
          <UserX className="w-4 h-4 mr-2 text-red-500 hidden group-hover:block" />
          <span className="group-hover:hidden">Connected</span>
          <span className="hidden group-hover:block">Remove</span>
        </Button>
      );
    }

    if (connectionStatus.status === 'pending') {
      if (connectionStatus.fromUserId === currentUserData?.uid) {
        return (
          <Button variant="secondary" className="w-full sm:w-auto font-semibold group" onClick={() => handleAction('remove')}>
            <Clock className="w-4 h-4 mr-2 text-yellow-500 group-hover:hidden" />
            <UserX className="w-4 h-4 mr-2 text-red-500 hidden group-hover:block" />
            <span className="group-hover:hidden">Pending</span>
            <span className="hidden group-hover:block">Withdraw</span>
          </Button>
        );
      } else {
        return (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="primary" className="flex-1 sm:flex-none font-semibold text-xs px-4" onClick={handleAccept}>
              Accept
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-none font-semibold text-xs px-4 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => handleAction('reject')}>
              Reject
            </Button>
          </div>
        );
      }
    }

    if (connectionStatus.status === 'rejected') {
      // If the current user was the one who sent and it was rejected, we probably just want to let them re-send (maybe implement cooldown)
      // For now, let's treat it as no connection.
       return (
        <Button variant="primary" className="w-full sm:w-auto font-semibold" onClick={() => handleAction('remove').then(() => handleConnect())}>
          <UserPlus className="w-4 h-4 mr-2" /> Connect Again
        </Button>
      );
    }

    return null;
  };

  const deleteResource = async (id: string, type: string) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    try {
      const collectionName = type === 'project' ? 'projects' : type === 'resource' ? 'resources' : 'feed_posts';
      await deleteDoc(doc(db, collectionName, id));
      toast.success('Deleted successfully');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 mt-6">
      <div className="h-64 bg-black/5 dark:bg-white/5 animate-pulse rounded-t-3xl" />
      <div className="px-6 md:px-10 pb-10">
        <div className="flex justify-between -mt-20 z-10 relative">
          <div className="w-40 h-40 rounded-full bg-black/10 dark:bg-white/10 animate-pulse border-4 border-[var(--bg-primary)]" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="w-1/3 h-8 bg-black/10 dark:bg-white/10 animate-pulse rounded-md" />
          <div className="w-1/4 h-5 bg-black/10 dark:bg-white/10 animate-pulse rounded-md" />
        </div>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-48 bg-black/5 dark:bg-white/5 animate-pulse rounded-2xl" />
          <div className="h-48 bg-black/5 dark:bg-white/5 animate-pulse rounded-2xl" />
        </div>
      </div>
    </div>
  );
  
  if (error || !profileData) return <div className="p-8 text-center text-red-500">{error || 'Profile not found'}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <BackButton />
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      <div className="space-y-6 lg:space-y-8">
        {/* PROFILE HEADER SECTION */}
        <div className="relative rounded-[32px] overflow-hidden glass-card border border-[var(--card-border)] bg-[var(--card-bg)] shadow-lg">
          {/* Cover Area */}
          <div className="h-40 md:h-56 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 relative overflow-hidden">
            {profileData.coverImage ? (
               <img src={profileData.coverImage} className="w-full h-full object-cover" alt="Cover" />
            ) : (
              <>
                <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/20 blur-3xl rounded-full"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-yellow-300/30 blur-3xl rounded-full"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 dark:to-black/60"></div>
              </>
            )}
          </div>

          <div className="px-6 md:px-10 pb-8 relative mt-0">
            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-end gap-6 relative z-10 w-full mb-4">
              <div className="relative shrink-0 -mt-16 sm:-mt-24 self-center md:self-auto">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full sm:rounded-[32px] border-[5px] border-[var(--card-bg)] overflow-hidden bg-white dark:bg-zinc-900 shadow-xl relative z-10"
                >
                  {profileData.photoURL ? (
                    <img src={profileData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-100 to-amber-200 flex items-center justify-center">
                      <User className="w-16 h-16 text-yellow-700/50" />
                    </div>
                  )}
                </motion.div>
                {/* Small Status Badge placed outside overflow-hidden */}
                <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-6 h-6 bg-green-500 border-4 border-[var(--card-bg)] rounded-full z-20 shadow-sm"></div>
              </div>
              
              <div className="text-center md:text-left flex flex-col items-center md:items-start flex-1 mb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)]">
                      {profileData.displayName || 'User'}
                    </h2>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                      <span className="px-4 py-1 bg-yellow-500 text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                        {profileData.role === 'student' ? 'Student' : profileData.role === 'alumni' ? 'Alumni' : profileData.role}
                      </span>
                      {profileData.department && (
                        <span className="text-sm font-semibold text-[var(--text-secondary)] flex items-center">
                          <GraduationCap className="w-4 h-4 mr-1.5 text-yellow-500" />
                          {profileData.department} {profileData.role === 'student' ? (profileData.yearOfStudy ? `• ${profileData.yearOfStudy}${profileData.yearOfStudy === '1' ? 'st' : profileData.yearOfStudy === '2' ? 'nd' : profileData.yearOfStudy === '3' ? 'rd' : 'th'} Year` : '') : (profileData.passOutYear ? `• Batch ${profileData.passOutYear}` : '')}
                        </span>
                      )}
                    </div>
                    
                    {/* Compact Stats Row */}
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                      <div className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors cursor-pointer">
                        <span className="font-bold text-[var(--text-primary)]">{connectionsCount}</span>
                        <span className="text-sm font-medium text-[var(--text-secondary)]">Connections</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]"></div>
                      <div className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors cursor-pointer">
                        <span className="font-bold text-[var(--text-primary)]">{projectsCount}</span>
                        <span className="text-sm font-medium text-[var(--text-secondary)]">Teams</span>
                      </div>
                      {profileData.role === 'mentor' && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]"></div>
                          <div className="flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors cursor-pointer">
                            <span className="font-bold text-[var(--text-primary)]">8</span>
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Mentees</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 pt-2 md:pt-0 self-center md:self-start">
                     {renderConnectionButton()}
                     {!isOwnProfile && (
                       <div className="flex gap-2">
                         <Button variant="outline" className="font-bold shadow-sm" onClick={handleMessage}>
                           <MessageSquare className="w-4 h-4 mr-2" /> Message
                         </Button>
                         <ReportButton targetId={userId!} targetType="user" />
                       </div>
                     )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN RESPONSIVE LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* LEFT COLUMN (Main Content) */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            
            {/* About Section */}
            <Card className="border-[var(--card-border)] shadow-sm hover:shadow-md transition-shadow group overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6 md:p-8">
                <h3 className="text-xl font-bold mb-4 flex items-center text-[var(--text-primary)]">
                  <User className="w-5 h-5 mr-3 text-yellow-500" /> About
                </h3>
                <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap text-[15px]">
                  {profileData.bio || 'This user prefers to keep their bio mysterious. Connections might reveal more!'}
                </p>
              </CardContent>
            </Card>

            {/* Experience Section */}
            {profileData.role !== 'student' && (profileData.company || profileData.position) && (
              <Card className="border-[var(--card-border)] shadow-sm hover:shadow-md transition-shadow group overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="p-6 md:p-8">
                  <h3 className="text-xl font-bold mb-6 flex items-center text-[var(--text-primary)]">
                    <Briefcase className="w-5 h-5 mr-3 text-blue-500" /> {profileData.role === 'alumni' ? 'Current Position' : 'Current Experience'}
                  </h3>
                  <div className="space-y-6">
                     <div className="flex gap-5 group/item">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800 transition-transform group-hover/item:scale-110 group-hover/item:rotate-3">
                          <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-[var(--text-primary)] leading-tight mb-1">{profileData.position || 'Professional'}</h4>
                          <p className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2">{profileData.company || 'Company'}</p>
                          <p className="text-xs text-[var(--text-tertiary)] font-medium">Present</p>
                        </div>
                     </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity Section (Real Time) */}
            <Card className="border-[var(--card-border)] shadow-sm hover:shadow-md transition-shadow group overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6 md:p-8">
                <h3 className="text-xl font-bold mb-6 flex items-center text-[var(--text-primary)]">
                  <Clock className="w-5 h-5 mr-3 text-purple-500" /> Recent Activity
                </h3>
                {recentActivities.length > 0 ? (
                  <div className="space-y-6 border-l-2 border-black/5 dark:border-white/10 ml-3 pl-6 relative">
                    {recentActivities.map((act, idx) => (
                      <div key={act.id} className="relative group/activity">
                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full ${idx === 0 ? 'bg-purple-500' : 'bg-black/20 dark:bg-white/20'} border-[3px] border-[var(--card-bg)]`}></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-[var(--text-primary)] font-medium mb-1 line-clamp-2">{act.content}</p>
                            <p className="text-xs text-[var(--text-tertiary)] font-bold">
                               {act.createdAt && !isNaN(act.createdAt) ? formatDistanceToNow(act.createdAt, { addSuffix: true }) : 'Recently'}
                            </p>
                          </div>
                          {(isOwnProfile || currentUserData?.role === 'admin') && (
                            <button 
                              onClick={() => deleteResource(act.id, act.type)}
                              className="opacity-0 group-hover/activity:opacity-100 p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">No recent activity to show.</p>
                )}
              </CardContent>
            </Card>

          </div>

          {/* RIGHT COLUMN (Compact Information) */}
          <div className="lg:col-span-1 space-y-6 lg:space-y-8">
            
            {/* Quick Info Card */}
            <Card className="border-[var(--card-border)] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-bl-[100px] pointer-events-none"></div>
               <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-5 flex items-center text-[var(--text-primary)]">
                    <User className="w-4 h-4 mr-2" /> Quick Info
                  </h3>
                  <div className="space-y-4">
                    {profileData.email && (
                      <div className="flex gap-3 text-[var(--text-secondary)]">
                        <Mail className="w-5 h-5 shrink-0" />
                        <div>
                          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 text-[var(--text-tertiary)]">Email</p>
                          <span className="text-sm font-medium break-all text-[var(--text-primary)]">{profileData.email}</span>
                        </div>
                      </div>
                    )}
                    {profileData.createdAt && (
                      <div className="flex gap-3 text-[var(--text-secondary)]">
                        <Calendar className="w-5 h-5 shrink-0" />
                        <div>
                          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 text-[var(--text-tertiary)]">Joined</p>
                          <span className="text-sm font-medium text-[var(--text-primary)]">{new Date(profileData.createdAt).getFullYear()}</span>
                        </div>
                      </div>
                    )}
                  </div>
               </CardContent>
            </Card>

            {/* Availability/Status Card */}
            {profileData.openToOpportunities && profileData.role !== 'alumni' && (
              <Card className="border border-green-500/20 shadow-sm bg-green-500/5 hover:bg-green-500/10 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-green-700 dark:text-green-400 mb-1">Open to Opportunities</h3>
                      <p className="text-sm text-green-600/80 dark:text-green-400/80">Currently exploring new roles and collaborations.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills Section */}
            {(profileData.skills && profileData.skills.length > 0) && (
              <Card className="border-[var(--card-border)] shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center text-[var(--text-primary)]">
                    <User className="w-4 h-4 mr-2" /> Skills & Expertise
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-black/5 dark:bg-white/5 border border-[var(--card-border)] hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-colors text-[var(--text-primary)] text-xs font-semibold rounded-lg cursor-default">
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Hub */}
            <Card className="border-[var(--card-border)] shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-bold mb-4 flex items-center text-[var(--text-primary)]">
                  <Link className="w-4 h-4 mr-2" /> Social Hub
                </h3>

                {profileData.github && (
                  <a href={profileData.github} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[var(--card-border)] hover:border-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                    <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Github className="w-4 h-4 text-[var(--text-primary)]" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">GitHub Profile</span>
                    <Link className="w-3 h-3 ml-auto text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}

                {profileData.linkedin && (
                  <a href={profileData.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[var(--card-border)] hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Linkedin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">LinkedIn Profile</span>
                    <Link className="w-3 h-3 ml-auto text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
                
                {(!profileData.github && !profileData.linkedin) && (
                  <p className="text-sm text-[var(--text-secondary)] italic text-center py-2">No social links added yet.</p>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onSuccess={fetchProfile}
      />
    </div>
  );
}

