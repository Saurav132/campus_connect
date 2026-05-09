import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Calendar, Clock, Plus, X, Users, Compass, Trash2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Event } from '../../types';
import ReportButton from '../../components/ReportButton';

export default function Events() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  // New Event State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('workshop');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [location, setLocation] = useState('');
  const [registrationLink, setRegistrationLink] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      
      // Sort upcoming events first, then past events
      const now = new Date();
      data.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        const aUpcoming = dateA > now;
        const bUpcoming = dateB > now;
        
        if (aUpcoming && !bUpcoming) return -1;
        if (!aUpcoming && bUpcoming) return 1;
        return dateB.getTime() - dateA.getTime(); // Closer events first if both upcoming, newer first if both past
      });
      
      setEvents(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDeleteEvent = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    
    const toastId = toast.loading('Deleting event...');
    try {
      await deleteDoc(doc(db, 'events', eventId));
      toast.success('Event deleted', { id: toastId });
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.code === 'permission-denied' 
        ? 'Permission Denied: You do not have rights to delete this event.' 
        : error.message || 'Failed to delete event';
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    if (!title || !description || !dateStr || !timeStr || !location) {
      toast.error('Please fill all required fields');
      return;
    }

    setPosting(true);
    try {
      // Combine date and time
      const datetime = new Date(`${dateStr}T${timeStr}`).toISOString();

      const newEvent: any = {
        title,
        description,
        type,
        date: datetime,
        location,
        postedBy: userData.uid,
        registeredUsers: [],
        verificationStatus: 'pending',
        createdAt: serverTimestamp()
      };

      if (registrationLink) newEvent.registrationLink = registrationLink;
      if (teamSize) {
        const size = parseInt(teamSize);
        if (!isNaN(size)) newEvent.teamSize = size;
      }
      if (requiredSkills) {
        newEvent.requiredSkills = requiredSkills.split(',').map(s => s.trim()).filter(s => s !== '');
      }

      await addDoc(collection(db, 'events'), newEvent);
      
      toast.success('Event sent for admin verification!');
      setIsPostModalOpen(false);
      
      // Reset
      setTitle(''); setDescription(''); setDateStr(''); setTimeStr(''); setLocation(''); setRegistrationLink(''); setTeamSize(''); setRequiredSkills('');
    } catch (error: any) {
      console.error('Publish Error:', error);
      const errorMessage = error.code === 'permission-denied' 
        ? 'Permission Denied: You do not have rights to post events.' 
        : error.message || 'Failed to publish event';
      toast.error(errorMessage);
    } finally {
      setPosting(false);
    }
  };

  const filtered = events.filter(ev => {
    const isOwner = userData?.uid === ev.postedBy;
    const isAdmin = userData?.role === 'admin';
    const isVerified = ev.verificationStatus === 'verified';
    
    // Only show verified events to others. Owners and admins see everything.
    if (!isVerified && !isOwner && !isAdmin) return false;

    return (
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ev.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-xl">
              <Calendar className="w-6 h-6 text-yellow-500" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter italic uppercase text-[var(--text-primary)]">
              Campus Events
            </h1>
          </div>
          <p className="text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] max-w-md">
            Discover hackathons, workshops, and seminars near you.
          </p>
        </div>
        <Button 
          onClick={() => setIsPostModalOpen(true)}
          className="flex items-center gap-3 bg-yellow-500 text-black hover:bg-yellow-600 font-black rounded-2xl h-14 px-8 shadow-xl shadow-yellow-500/20 transition-all active:scale-95 uppercase italic tracking-wider"
        >
          <Plus className="w-5 h-5 stroke-[3px]" />
          Host Event
        </Button>
      </div>

      <div className="relative">
        <input 
          type="text"
          placeholder="SEARCH EVENTS BY TITLE OR TYPE..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/20 dark:bg-white/[0.03] backdrop-blur-3xl border-0 rounded-[2rem] px-8 py-5 text-sm font-bold uppercase tracking-widest focus:ring-2 ring-yellow-500/50 transition-all placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
             <Card key={i} className="h-72 animate-pulse flex flex-col border-transparent overflow-hidden">
               <div className="h-32 bg-black/10 dark:bg-white/10" />
               <div className="p-6 flex flex-col flex-1 relative">
                 <div className="absolute -top-6 left-6 w-12 h-16 bg-black/5 dark:bg-white/5 border border-[var(--card-border)] rounded-xl" />
                 <div className="pt-8 space-y-4">
                   <div className="w-3/4 h-5 bg-black/10 dark:bg-white/10 rounded-md" />
                   <div className="space-y-2">
                     <div className="w-1/2 h-4 bg-black/10 dark:bg-white/10 rounded-md" />
                     <div className="w-1/2 h-4 bg-black/10 dark:bg-white/10 rounded-md" />
                   </div>
                 </div>
               </div>
             </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card-bg)]/50">
          <Compass className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">No events found</h3>
          <p className="text-[var(--text-secondary)]">Try another search or host one yourself!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((ev, index) => {
            const dateObj = new Date(ev.date);
            const isUpcoming = dateObj > new Date();
            
            return (
            <motion.div
              key={ev.id}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className={`group relative overflow-hidden border-0 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] h-full flex flex-col transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-500/10 hover:-translate-y-2 cursor-pointer ${!isUpcoming ? 'opacity-60 grayscale' : ''}`} 
                onClick={() => navigate(`/events/${ev.id}`)}
              >
                {/* Animated Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="h-44 relative overflow-hidden">
                  <div className="absolute inset-0 bg-slate-900">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-transparent to-purple-600/30 opacity-50" />
                    {/* Abstract design elements */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl group-hover:bg-yellow-500/40 transition-colors" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
                  </div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-yellow-500">
                      <Zap className="w-8 h-8 fill-current" />
                    </div>
                  </div>

                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <ReportButton targetId={ev.id} targetType="event" />
                    {(userData?.uid === ev.postedBy || userData?.role === 'admin') && (
                      <button 
                        onClick={(e) => handleDeleteEvent(e, ev.id)}
                        className="bg-black/60 backdrop-blur-md text-red-400 p-2 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg border border-white/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="absolute bottom-6 left-6">
                    <div className="bg-yellow-500 text-black text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-widest shadow-lg italic">
                      {ev.type}
                    </div>
                  </div>
                </div>

                <CardContent className="p-8 flex flex-col flex-1 relative z-10">
                  <div className="absolute -top-10 right-8 bg-white dark:bg-black/80 backdrop-blur-xl border border-white/10 dark:border-yellow-500/20 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-3 min-w-[70px] transition-transform group-hover:scale-110">
                    <span className="text-[10px] text-yellow-500 font-black uppercase tracking-widest mb-1">
                      {dateObj.toLocaleDateString('default', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-black italic">{dateObj.getDate()}</span>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="font-black text-2xl mb-3 leading-tight italic uppercase tracking-tight group-hover:text-yellow-500 transition-colors">
                      {ev.title}
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
                        <div className="p-1.5 bg-white/10 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-yellow-500" />
                        </div>
                        {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
                        <div className="p-1.5 bg-white/10 rounded-lg">
                          <MapPin className="w-3.5 h-3.5 text-yellow-500" />
                        </div>
                        <span className="truncate">{ev.location}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-[var(--text-secondary)] line-clamp-2 mb-4 italic leading-relaxed">
                    "{ev.description}"
                  </p>

                  {(ev.teamSize || (ev.requiredSkills && ev.requiredSkills.length > 0)) && (
                    <div className="flex flex-wrap gap-3 mb-6">
                      {ev.teamSize && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-yellow-500">
                          <Users className="w-3 h-3" /> Size: {ev.teamSize}
                        </div>
                      )}
                      {ev.requiredSkills?.slice(0, 2).map(skill => (
                        <span key={skill} className="px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {skill}
                        </span>
                      ))}
                      {(ev.requiredSkills?.length || 0) > 2 && (
                        <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest pt-1">
                          +{(ev.requiredSkills?.length || 0) - 2} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-7 h-7 rounded-full border-2 border-black bg-yellow-500 flex items-center justify-center text-[8px] font-black uppercase">
                            U{i}
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest ml-1">
                        {ev.registeredUsers?.length || 0} RSVPs
                      </span>
                    </div>

                    {ev.verificationStatus === 'pending' && (
                      <span className="text-[9px] font-black text-yellow-500/50 uppercase italic tracking-widest">
                        Verification Pending
                      </span>
                    )}

                    {!isUpcoming && (
                      <span className="text-[9px] font-black text-red-500 uppercase italic tracking-widest bg-red-500/10 px-2 py-1 rounded-lg">
                        Event Concluded
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )})}
        </div>
      )}

      {/* Post Event Modal */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-primary)] border border-[var(--card-border)] rounded-2xl w-full max-w-2xl my-8 shadow-2xl"
            >
              <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between sticky top-0 bg-[var(--bg-primary)] rounded-t-2xl z-10">
                <h2 className="text-xl font-bold">Host an Event</h2>
                <button onClick={() => setIsPostModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handlePost} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Event Title <span className="text-red-500">*</span></label>
                    <input 
                      required type="text" value={title} onChange={e => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                      placeholder="e.g. Intro to Web3 Workshop"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <select 
                        value={type} onChange={e => setType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all appearance-none"
                      >
                        <option value="hackathon">Hackathon</option>
                        <option value="workshop">Workshop</option>
                        <option value="webinar">Webinar</option>
                        <option value="seminar">Seminar</option>
                        <option value="coding contest">Coding Contest</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Location <span className="text-red-500">*</span></label>
                      <input 
                        required type="text" value={location} onChange={e => setLocation(e.target.value)}
                        placeholder="e.g. Auditorium, G-Meet Link..."
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date <span className="text-red-500">*</span></label>
                      <input 
                        required type="date" value={dateStr} onChange={e => setDateStr(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Time <span className="text-red-500">*</span></label>
                      <input 
                        required type="time" value={timeStr} onChange={e => setTimeStr(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description <span className="text-red-500">*</span></label>
                    <textarea 
                      required value={description} onChange={e => setDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all h-32 resize-none"
                      placeholder="What should attendees expect?"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Team Size (Optional)</label>
                      <input 
                        type="number" value={teamSize} onChange={e => setTeamSize(e.target.value)}
                        placeholder="e.g. 4"
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Registration Link (Optional)</label>
                      <input 
                        type="url" value={registrationLink} onChange={e => setRegistrationLink(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Required Skills (Optional, comma separated)</label>
                    <input 
                      type="text" value={requiredSkills} onChange={e => setRequiredSkills(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                      placeholder="e.g. React, Node.js, Python"
                    />
                  </div>

                  <div className="pt-6 border-t border-[var(--card-border)] flex justify-end gap-3 sticky bottom-0 bg-[var(--bg-primary)] pb-2">
                    <Button type="button" variant="ghost" onClick={() => setIsPostModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={posting} className="bg-[var(--accent)] text-black font-semibold hover:bg-[var(--accent-hover)] px-8 shadow-lg shadow-[var(--accent)]/20">
                      Host Event
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
