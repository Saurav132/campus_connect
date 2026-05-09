import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GraduationCap, Building2, User, Users, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BackButton } from '../../components/ui/BackButton';
import { Connection, acceptConnectionRequest, rejectConnectionRequest } from '../../services/connectionService';

interface NetworkUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'student' | 'alumni' | 'mentor' | 'admin';
  company?: string;
  position?: string;
  department?: string;
  skills?: string[];
}

export default function Network() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<NetworkUser[]>([]);
  const [myConnections, setMyConnections] = useState<Connection[]>([]);
  const [connectionUsers, setConnectionUsers] = useState<Record<string, NetworkUser>>({});
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'student' | 'alumni'>('all');
  const [activeTab, setActiveTab] = useState<'discover' | 'connections' | 'requests' | 'sent'>('discover');

  useEffect(() => {
    const fetchNetworkData = async () => {
      if (!userData?.uid) return;
      try {
        // Fetch matching users
        const qUsers = query(
          collection(db, 'users'),
          where('role', 'in', ['student', 'alumni'])
        );
        const snapshotUsers = await getDocs(qUsers);
        const fetchedUsers: NetworkUser[] = [];
        snapshotUsers.forEach(doc => {
          const data = doc.data() as NetworkUser;
          if (data.uid !== userData.uid) {
            fetchedUsers.push({ ...data, uid: doc.id });
          }
        });
        setUsers(fetchedUsers);

        // Fetch connections
        const qConn1 = query(collection(db, 'connections'), where('fromUserId', '==', userData.uid));
        const qConn2 = query(collection(db, 'connections'), where('toUserId', '==', userData.uid));
        const [snap1, snap2] = await Promise.all([getDocs(qConn1), getDocs(qConn2)]);
        
        const connections: Connection[] = [];
        const relatedUserIds = new Set<string>();
        
        snap1.forEach(doc => {
          const data = doc.data() as Connection;
          connections.push({ ...data, id: doc.id });
          relatedUserIds.add(data.toUserId);
        });
        snap2.forEach(doc => {
          const data = doc.data() as Connection;
          connections.push({ ...data, id: doc.id });
          relatedUserIds.add(data.fromUserId);
        });

        setMyConnections(connections);

        // Fetch user data for those connections if not already in fetchedUsers (or just build a map)
        const userMap: Record<string, NetworkUser> = {};
        fetchedUsers.forEach(u => userMap[u.uid] = u);
        setConnectionUsers(userMap);
      } catch (error) {
        console.error('Error fetching network data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNetworkData();
  }, [userData]);

  const handleAccept = async (connId: string, fromId: string) => {
    if (!userData?.uid) return;
    await acceptConnectionRequest(connId, userData.uid, fromId);
    setMyConnections(prev => prev.map(c => c.id === connId ? { ...c, status: 'accepted' } : c));
  };

  const handleReject = async (connId: string) => {
    await rejectConnectionRequest(connId);
    setMyConnections(prev => prev.map(c => c.id === connId ? { ...c, status: 'rejected' } : c));
  };

  const filteredDiscoveryUsers = users.filter((user) => {
    // Only show discoverable users if they don't have a pending/accepted connection with us
    const hasConnection = myConnections.some(c => 
      ((c.fromUserId === user.uid && c.toUserId === userData?.uid) || 
       (c.toUserId === user.uid && c.fromUserId === userData?.uid)) && 
      c.status !== 'rejected'
    );
    if (hasConnection) return false;

    const matchesSearch = 
      (user.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.department?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())));
      
    const matchesRole = filterRole === 'all' || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  const acceptedConnections = myConnections.filter(c => c.status === 'accepted');
  const pendingRequests = myConnections.filter(c => c.status === 'pending' && c.toUserId === userData?.uid);
  const sentRequests = myConnections.filter(c => c.status === 'pending' && c.fromUserId === userData?.uid);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <BackButton className="hidden md:flex" />
            <h1 className="text-3xl font-bold tracking-tight">Network</h1>
          </div>
          <p className="text-[var(--text-secondary)] mt-1">Manage and discover professional connections.</p>
        </div>
      </div>

      <div className="flex space-x-1 glass-card p-1 rounded-2xl w-full max-w-2xl overflow-x-auto">
        {(['discover', 'connections', 'requests', 'sent'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 whitespace-nowrap text-sm font-semibold rounded-xl transition-all ${activeTab === tab ? 'bg-yellow-400 text-yellow-950 shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            {tab === 'discover' && 'Discover'}
            {tab === 'connections' && `My Network (${acceptedConnections.length})`}
            {tab === 'requests' && `Received (${pendingRequests.length})`}
            {tab === 'sent' && `Sent (${sentRequests.length})`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'discover' && (
          <motion.div key="discover" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
              <select 
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-yellow-400 focus:outline-none transition-colors w-full md:w-auto text-[var(--text-primary)]"
              >
                <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All</option>
                <option value="student" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Students</option>
                <option value="alumni" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Alumni</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                   <Card key={i} className="h-64 animate-pulse flex flex-col border-transparent overflow-hidden">
                     <div className="h-20 bg-black/10 dark:bg-white/10 relative">
                       <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-full border-4 border-[var(--card-bg)] bg-black/10 dark:bg-white/10 z-10" />
                     </div>
                     <div className="pt-10 pb-6 px-6 flex-1 flex flex-col">
                       <div className="w-3/4 h-5 bg-black/10 dark:bg-white/10 rounded-md mb-2" />
                       <div className="w-1/3 h-3 bg-black/10 dark:bg-white/10 rounded-md mb-6" />
                       <div className="w-full h-3 bg-black/10 dark:bg-white/10 rounded-md mb-2" />
                       <div className="w-2/3 h-3 bg-black/10 dark:bg-white/10 rounded-md mb-6" />
                       <div className="w-full h-9 bg-black/5 dark:bg-white/5 rounded-md mt-auto" />
                     </div>
                   </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDiscoveryUsers.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-[var(--text-secondary)]">
                    No users found.
                  </div>
                ) : (
                  filteredDiscoveryUsers.map((user, i) => (
                    <motion.div
                      key={user.uid}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                    >
                      <UserCard user={user} onSelect={() => navigate(`/profile/${user.uid}`)} />
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'connections' && (
          <motion.div key="connections" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {acceptedConnections.length === 0 ? (
                <div className="col-span-full text-center py-12 text-[var(--text-secondary)]">
                  You don't have any connections yet. Go to Discover to find people!
                </div>
              ) : (
                acceptedConnections.map((conn, i) => {
                  const otherUserId = conn.fromUserId === userData?.uid ? conn.toUserId : conn.fromUserId;
                  const user = connectionUsers[otherUserId];
                  if (!user) return null;
                  return (
                    <motion.div key={conn.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, duration: 0.3 }}>
                      <UserCard user={user} onSelect={() => navigate(`/profile/${user.uid}`)} actionLabel="Message" />
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'requests' && (
          <motion.div key="requests" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pendingRequests.length === 0 ? (
                <div className="col-span-full text-center py-12 text-[var(--text-secondary)]">
                  No pending connection requests.
                </div>
              ) : (
                pendingRequests.map((req, i) => {
                  const user = connectionUsers[req.fromUserId];
                  if (!user) return null;
                  return (
                    <motion.div key={req.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}>
                      <Card className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(`/profile/${user.uid}`)}>
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-yellow-50 flex items-center justify-center shrink-0">
                            {user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-yellow-600" />}
                          </div>
                          <div>
                            <h4 className="font-bold">{user.displayName || 'User'}</h4>
                            <p className="text-xs text-[var(--text-secondary)] uppercase">{user.role}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <Button size="sm" variant="primary" onClick={() => handleAccept(req.id!, user.uid)}>Accept</Button>
                           <Button size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-50" onClick={() => handleReject(req.id!)}>Reject</Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'sent' && (
          <motion.div key="sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sentRequests.length === 0 ? (
                <div className="col-span-full text-center py-12 text-[var(--text-secondary)]">
                  No sent connection requests.
                </div>
              ) : (
                sentRequests.map((req, i) => {
                  const user = connectionUsers[req.toUserId];
                  if (!user) return null;
                  return (
                    <motion.div key={req.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}>
                      <Card className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(`/profile/${user.uid}`)}>
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-yellow-50 flex items-center justify-center shrink-0">
                            {user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-yellow-600" />}
                          </div>
                          <div>
                            <h4 className="font-bold">{user.displayName || 'User'}</h4>
                            <p className="text-xs text-[var(--text-secondary)] uppercase">{user.role}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <Button size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-50" onClick={() => handleReject(req.id!)}>Cancel Request</Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

  function UserCard({ user, onSelect, actionLabel = "View Profile" }: { user: NetworkUser, onSelect: () => void, actionLabel?: string }) {
    return (
      <Card 
        className="h-full hover:shadow-xl dark:hover:shadow-white/5 transition-all duration-300 cursor-pointer group flex flex-col overflow-hidden"
        onClick={onSelect}
      >
        <div className="h-20 bg-gradient-to-r from-yellow-100 to-amber-200 dark:from-yellow-900/40 dark:to-amber-900/40 relative">
           <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-full border-4 border-[var(--card-bg)] overflow-hidden bg-white z-10 transition-transform duration-300 group-hover:scale-105">
             <img 
               src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`} 
               alt={user.displayName || 'User'} 
               className="w-full h-full object-cover" 
             />
           </div>
        </div>
      
      <CardContent className="pt-10 pb-6 px-6 flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="font-bold text-lg leading-tight truncate group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
            {user.displayName || 'Unknown User'}
          </h3>
          <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-500 uppercase tracking-widest mt-1">
            {user.role}
          </div>
        </div>
        
        <div className="space-y-2 mt-2 mb-4 flex-1">
          {user.company && (
            <div className="flex items-center text-sm text-[var(--text-secondary)] truncate">
              <Building2 className="w-4 h-4 mr-2 shrink-0" />
              <span className="truncate">{user.position} @ {user.company}</span>
            </div>
          )}
          {!user.company && user.department && (
            <div className="flex items-center text-sm text-[var(--text-secondary)] truncate">
              <GraduationCap className="w-4 h-4 mr-2 shrink-0" />
              <span className="truncate">{user.department}</span>
            </div>
          )}
        </div>

        <Button variant="secondary" className="w-full text-xs font-semibold hover:border-yellow-400 hover:text-yellow-600 transition-colors">
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

