import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, limit, orderBy, getDoc, doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Users, Briefcase, Calendar, ChevronRight, Activity, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MatchmakingWidget from './MatchmakingWidget';

export default function Dashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<any[]>([]);
  const [eventsCount, setEventsCount] = useState<number | string>('Live');
  const [opportunitiesCount, setOpportunitiesCount] = useState<number | string>('New');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!userData?.uid) return;
      try {
        const q1 = query(
          collection(db, 'connections'),
          where('fromUserId', '==', userData.uid),
          where('status', '==', 'accepted')
        );
        const q2 = query(
          collection(db, 'connections'),
          where('toUserId', '==', userData.uid),
          where('status', '==', 'accepted')
        );
        
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        let allConnections = [...snap1.docs, ...snap2.docs].map(d => ({ id: d.id, ...d.data() } as any));
        
        // Sort by updatedAt desc
        allConnections.sort((a, b) => {
          const timeA = a.updatedAt?.seconds || 0;
          const timeB = b.updatedAt?.seconds || 0;
          return timeB - timeA;
        });

        const recentConnections = allConnections.slice(0, 3);
        
        const connPromises = recentConnections.map(async (data) => {
          const otherId = data.fromUserId === userData.uid ? data.toUserId : data.fromUserId;
          // fetch other profile
          if (!otherId) return { ...data, otherUser: null, otherId: null };
          try {
            const userDoc = await getDoc(doc(db, 'users', otherId));
            return { ...data, otherUser: userDoc.exists() ? userDoc.data() : null, otherId };
          } catch(e) {
            return { ...data, otherUser: null, otherId };
          }
        });

        const activeConnections = await Promise.all(connPromises);
        setConnections(activeConnections);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
    
    // Listen for events and opportunities to show real time counts
    const unsubEvents = onSnapshot(query(collection(db, 'events'), where('verificationStatus', '==', 'verified'), orderBy('createdAt', 'desc'), limit(10)), (snap) => {
      setEventsCount(snap.docs.length > 0 ? snap.docs.length : 0);
    });
    
    const unsubOpp = onSnapshot(query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'), limit(10)), (snap) => {
      setOpportunitiesCount(snap.docs.length > 0 ? snap.docs.length : 0);
    });

    return () => {
      unsubEvents();
      unsubOpp();
    };
  }, [userData]);

  const stats = [
    { label: 'Network Connections', value: connections.length > 0 ? connections.length : 'Start', icon: Users, trend: 'Grow your network' },
    { label: 'Upcoming Events', value: eventsCount, icon: Calendar, trend: 'Real-time updates' },
    { label: 'Opportunities', value: opportunitiesCount, icon: Briefcase, trend: 'Real-time updates' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {userData?.displayName?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">Here's your campus intelligence briefing for today.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <Button variant="primary" className="shrink-0 group overflow-hidden relative" onClick={() => navigate('/network')}>
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Browse Network
            </span>
          </Button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="group cursor-pointer"
            onClick={() => {
              if (stat.label === 'Network Connections') navigate('/network');
              if (stat.label === 'Upcoming Events') navigate('/events');
              if (stat.label === 'Opportunities') navigate('/opportunities');
            }}
          >
            <Card className="h-full hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-white/5 transition-all duration-300 relative overflow-hidden border-[var(--card-border)] hover:border-yellow-500/30">
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity duration-500 transform group-hover:scale-150 rotate-12 text-yellow-500">
                <stat.icon className="w-24 h-24" />
              </div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 dark:from-yellow-400/10 dark:to-amber-500/10 shadow-inner">
                    <stat.icon className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  {stat.value === 'Start' ? (
                    <Button onClick={(e) => { e.stopPropagation(); navigate('/network'); }} className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full">
                      Start
                    </Button>
                  ) : (
                    <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
                  )}
                  <p className="font-medium text-[var(--text-secondary)]">{stat.label}</p>
                </div>
                <div className="mt-4 text-sm text-[var(--text-tertiary)] font-medium flex items-center gap-2">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  {stat.trend}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <MatchmakingWidget />

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3, duration: 0.5 }}
           className="xl:col-span-1"
        >
          <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Network Pulse</CardTitle>
              <CardDescription>Your latest strategic connections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
                </div>
              ) : connections.length > 0 ? (
                <div className="space-y-3">
                  {connections.map((conn) => (
                    <div 
                      key={conn.id} 
                      onClick={() => navigate(`/profile/${conn.otherId}`)}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--bg-secondary)] transition-all cursor-pointer group border border-transparent hover:border-[var(--card-border)] hover:shadow-sm"
                    >
                      <img 
                        src={conn.otherUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(conn.otherUser?.displayName || 'User')}&background=random`} 
                        alt="Avatar"
                        className="w-12 h-12 rounded-full object-cover border-2 border-transparent group-hover:border-yellow-400/50 transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                          {conn.otherUser?.displayName || 'Unknown User'}
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {conn.otherUser?.role || 'Student'} • {conn.otherUser?.department || 'University'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-yellow-500 transition-colors shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 px-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--card-border)]">
                    <Users className="w-6 h-6 text-[var(--text-tertiary)]" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">You haven't made any connections yet.</p>
                </div>
              )}
              {connections.length > 0 && (
                <Button variant="ghost" className="w-full mt-4 text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 group" onClick={() => navigate('/network')}>
                  Expand Network <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
