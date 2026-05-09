import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import {
  LayoutDashboard,
  Hash,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Briefcase,
  Sparkles,
  MessageSquare,
  User,
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  Check,
  FolderKanban,
  FileText,
  Shield
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AppNotification } from '../services/connectionService';

// --- Sidebar ---
const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Hash, label: 'Community Feed', path: '/feed' },
  { icon: Users, label: 'Network', path: '/network' },
  { icon: GraduationCap, label: 'Mentorship', path: '/mentorship' },
  { icon: FolderKanban, label: 'Team Finder', path: '/projects' },
  { icon: BookOpen, label: 'Resources', path: '/resources' },
  { icon: Calendar, label: 'Events', path: '/events' },
  { icon: Briefcase, label: 'Opportunities', path: '/opportunities' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: FileText, label: 'AI Resume Checker', path: '/ats-resume' },
];

function Sidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const { userData, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isProfileActive = location.pathname === `/profile/${userData?.uid}`;

  return (
    <div className={cn(
      "flex flex-col h-full",
      mobile ? "w-full" : "w-64"
    )}>
      <div className="p-6 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-8 h-8 rounded-lg bg-yellow-400 glow-yellow flex items-center justify-center group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight group-hover:opacity-80 transition-opacity">Campus Connect <span className="text-yellow-500">AI</span></span>
        </div>
        {mobile && (
           <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
             <X className="w-5 h-5" />
           </button>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
        {navItems.map((item) => (
          <motion.div
            key={item.path}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <NavLink
              to={item.path}
              onClick={mobile ? onClose : undefined}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group",
                isActive 
                  ? "active-nav shadow-lg shadow-yellow-500/20" 
                  : "text-[var(--text-secondary)] hover:bg-yellow-50 dark:hover:bg-white/5 hover:text-[var(--text-primary)] font-medium"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-5 h-5 transition-all duration-300", isActive ? "text-yellow-600 dark:text-yellow-500 scale-110" : "opacity-70 group-hover:opacity-100 group-hover:text-yellow-500 group-hover:scale-110")} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-0 w-1 h-6 bg-yellow-500 rounded-r-full"
                    />
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}

        <div className="pt-4 mt-4 border-t border-[var(--card-border)]">
          <motion.div
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <NavLink
              to={`/profile/${userData?.uid}`}
              onClick={mobile ? onClose : undefined}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group",
                isProfileActive
                  ? "active-nav shadow-lg shadow-yellow-500/20" 
                  : "text-[var(--text-secondary)] hover:bg-yellow-50 dark:hover:bg-white/5 hover:text-[var(--text-primary)] font-medium"
              )}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 ring-1 ring-[var(--card-border)] group-hover:ring-yellow-500 transition-all">
                {userData?.photoURL ? (
                  <img src={userData.photoURL} alt="Me" className="w-full h-full object-cover" />
                ) : (
                  <User className={cn("w-full h-full p-0.5 transition-all", isProfileActive ? "text-yellow-600 dark:text-yellow-500 scale-110" : "opacity-70 group-hover:opacity-100 group-hover:text-yellow-500 group-hover:scale-110")} />
                )}
              </div>
              <span>My Profile</span>
              {isProfileActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-6 bg-yellow-500 rounded-r-full"
                />
              )}
            </NavLink>
          </motion.div>
        </div>

        {userData?.role === 'admin' && (
          <div className="pt-2 mt-2 border-t border-[var(--card-border)]/50">
            <motion.div
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <NavLink
                to="/admin"
                onClick={mobile ? onClose : undefined}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group",
                  isActive 
                    ? "active-nav shadow-lg shadow-yellow-500/20" 
                    : "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium"
                )}
              >
                <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Admin Panel</span>
              </NavLink>
            </motion.div>
          </div>
        )}
      </nav>

      <div className="p-4 mt-auto">
        <motion.button 
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { logout(); onClose?.(); }}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
        >
          <LogOut className="w-5 h-5 opacity-80 group-hover:scale-110 transition-transform" />
          <span>Sign Out</span>
        </motion.button>
      </div>
    </div>
  );
}

// --- TopHeader ---
function TopHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { theme, setTheme } = useTheme();
  const { userData } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userData?.uid) return;

    // Listen for notifications
    const q1 = query(
      collection(db, 'notifications'), 
      where('receiverId', '==', userData.uid)
    );
    const q2 = query(
      collection(db, 'notifications'), 
      where('userId', '==', userData.uid) // fallback for older connection notifications
    );

    const handleSnapshot = (snapshot: any, isOld: boolean) => {
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        isOldFormat: isOld
      }));
    };

    let notifsMap = new Map();

    const updateNotifs = () => {
      const allNotifs = Array.from(notifsMap.values());
      allNotifs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setNotifications(allNotifs);
    };

    const unsub1 = onSnapshot(q1, (snapshot) => {
      snapshot.forEach(doc => notifsMap.set(doc.id, handleSnapshot({ docs: [doc] }, false)[0]));
      updateNotifs();
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      snapshot.forEach(doc => notifsMap.set(doc.id, handleSnapshot({ docs: [doc] }, true)[0]));
      updateNotifs();
    });

    return () => { unsub1(); unsub2(); };
  }, [userData?.uid]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => (n.isOldFormat ? !n.read : !n.isRead)).length;

  const handleNotificationClick = async (notif: any) => {
    if ((notif.isOldFormat && !notif.read) || (!notif.isOldFormat && !notif.isRead)) {
      if (notif.id) {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true, isRead: true });
      }
    }
    
    if (notif.routePath) {
      navigate(notif.routePath);
    } else if (notif.type === 'connection_request') {
      navigate('/network');
    } else if (notif.type === 'connection_accepted') {
      navigate(`/profile/${notif.senderId}`);
    }
    setShowNotifications(false);
  };
  
  const markAllRead = async () => {
    const promises = notifications
      .filter(n => (n.isOldFormat ? !n.read : !n.isRead))
      .map(n => updateDoc(doc(db, 'notifications', n.id!), { read: true, isRead: true }));
    await Promise.all(promises);
  };

  return (
    <header className="h-20 glass-header flex items-center justify-between px-6 z-30 relative sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenSidebar}
          className="p-2 rounded-xl lg:hidden hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[var(--text-secondary)]"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[var(--text-secondary)] relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-[var(--bg-primary)]"></span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-80 glass-card rounded-2xl shadow-xl overflow-hidden flex flex-col"
              >
                <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
                  <h3 className="font-bold">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-yellow-600 hover:text-yellow-700 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-[var(--text-secondary)]">No new notifications</div>
                  ) : (
                    notifications.map(notif => {
                      const isUnread = notif.isOldFormat ? !notif.read : !notif.isRead;
                      return (
                      <div 
                        key={notif.id} 
                        onClick={() => handleNotificationClick(notif)}
                        className={cn(
                          "p-4 border-b border-[var(--card-border)]/50 last:border-b-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
                          isUnread ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""
                        )}
                      >
                        <div className="flex gap-3 items-start">
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            isUnread ? "bg-yellow-500" : "bg-transparent"
                          )} />
                          <div>
                            {notif.isOldFormat ? (
                              <>
                                <p className="text-sm font-medium">
                                  {notif.type === 'connection_request' ? "New connection request" : "Connection accepted"}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                                  {notif.type === 'connection_request' 
                                    ? "Someone wants to connect with you. Review their profile." 
                                    : "Your connection request was accepted. Say hi!"}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium capitalize">
                                  {notif.relatedType} Notification
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                                  {notif.message}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-px bg-[var(--card-border)] mx-1 sm:mx-2"></div>

        <NavLink 
          to={`/profile/${userData?.uid}`}
          className="flex items-center gap-3 pl-1 sm:pl-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 pr-2 py-1 transition-colors cursor-pointer"
        >
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium leading-none">{userData?.displayName || 'User'}</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 capitalize">{userData?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-yellow-400/30">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-yellow-200 to-amber-300 flex items-center justify-center">
                <User className="w-5 h-5 text-yellow-800" />
              </div>
            )}
          </div>
        </NavLink>
      </div>
    </header>
  );
}

// --- Layout ---
import NeuralBackground from '../components/ui/NeuralBackground';
import GlobalAiChatbot from '../components/ai/GlobalAiChatbot';

export function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex overflow-hidden relative selection:bg-yellow-200 selection:text-yellow-900 dark:selection:bg-yellow-900/50 dark:selection:text-yellow-100">
      
      {/* Futuristic Animated Neural Background */}
      <NeuralBackground />

      {/* Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] dark:opacity-[0.05]" 
           style={{ backgroundImage: 'linear-gradient(rgba(250, 204, 21, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(250, 204, 21, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block glass-sidebar relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-[var(--bg-secondary)] z-50 shadow-2xl lg:hidden border-r border-[var(--card-border)]"
            >
              <Sidebar mobile onClose={() => setMobileMenuOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col h-screen relative z-10 w-full overflow-hidden">
        <TopHeader onOpenSidebar={() => setMobileMenuOpen(true)} />
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
           <Outlet />
        </div>
      </main>

      <GlobalAiChatbot />
    </div>
  );
}
