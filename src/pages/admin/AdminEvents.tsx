import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Calendar, MapPin, Clock, Check, X, Loader2, AlertCircle, Trash2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { Event } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { createNotification } from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminEvents() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected'>('pending');

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admin_events');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (event: Event, newStatus: 'verified' | 'rejected') => {
    if (!event.id) return;
    
    try {
      await updateDoc(doc(db, 'events', event.id), {
        verificationStatus: newStatus
      });

      if (newStatus === 'verified') {
        toast.success('Event approved and published!');
        
        // Notify connections of the owner
        const { notifyConnections } = await import('../../services/notificationService');
        await notifyConnections(
          event.postedBy,
          event.id,
          'event',
          `/events/${event.id}`,
          `is hosting a new event: ${event.title}`
        );

        // Also notify the owner
        await createNotification({
          receiverId: event.postedBy,
          senderId: 'system',
          relatedId: event.id,
          relatedType: 'event',
          routePath: `/events/${event.id}`,
          message: `Your event "${event.title}" has been approved and is now live!`,
          isRead: false,
          createdAt: new Date().toISOString()
        });

        // Cross-post to Community Feed
        try {
          const ownerDoc = await getDoc(doc(db, 'users', event.postedBy));
          const ownerData = ownerDoc.data();
          
          await addDoc(collection(db, 'feed_posts'), {
            userId: event.postedBy,
            userName: ownerData?.displayName || 'Unknown',
            userRole: ownerData?.role || 'student',
            userPhotoURL: ownerData?.photoURL || null,
            content: `I'm hosting a new event: ${event.title}! \n\n${event.description}`,
            createdAt: serverTimestamp(),
            likes: 0,
            likedBy: [],
            comments: 0
          });
        } catch (feedError) {
          console.error("Error cross-posting to feed:", feedError);
        }
      } else {
        toast.success('Event declined.');
        
        // Notify the owner
        await createNotification({
          receiverId: event.postedBy,
          senderId: 'system',
          relatedId: event.id,
          relatedType: 'event',
          routePath: '/events',
          message: `Your event "${event.title}" was declined by the administrator.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${event.id}`);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!window.confirm('Delete this event permanently? This action cannot be undone.')) return;
    
    const toastId = toast.loading('Deleting event...');
    try {
      await deleteDoc(doc(db, 'events', eventId));
      toast.success('Event deleted successfully', { id: toastId });
    } catch (error: any) {
      console.error("Delete error:", error);
      const errorMessage = error.code === 'permission-denied' 
        ? 'Permission Denied: You do not have rights to delete this event.' 
        : error.message || 'Failed to delete event.';
      toast.error(errorMessage, { id: toastId });
      // Keep report for system logs
      try { handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`); } catch(e) {}
    }
  };

  const filteredEvents = events.filter(e => {
    if (activeTab === 'pending') return e.verificationStatus === 'pending' || !e.verificationStatus;
    return e.verificationStatus === activeTab;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Event Moderation</h1>
          <p className="text-[var(--text-secondary)] mt-1">Review and verify campus event requests.</p>
          <div className="mt-2 text-[10px] text-[var(--text-tertiary)] font-mono bg-white/5 px-2 py-1 rounded inline-flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${userData?.role === 'admin' ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'}`}></span>
            Session: {userData?.email || 'Checking...'} | Admin: {userData?.role === 'admin' ? 'Confirmed' : 'Checking...'}
          </div>
        </div>
      </div>

      <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--card-border)] w-fit">
        {(['pending', 'verified', 'rejected'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              activeTab === tab 
                ? 'bg-[var(--accent)] text-black shadow-lg shadow-[var(--accent)]/20' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>
      ) : filteredEvents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-[var(--text-secondary)]">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No {activeTab} events found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredEvents.map(event => (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-64 p-6 bg-[var(--bg-secondary)] border-b md:border-b-0 md:border-r border-[var(--card-border)]">
                        <div className="flex items-center gap-2 mb-4">
                          <div className={`w-2 h-2 rounded-full ${
                            event.verificationStatus === 'verified' ? 'bg-emerald-500' :
                            event.verificationStatus === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {event.verificationStatus || 'pending'}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                        <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(event.date).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div className="mb-4">
                          <h4 className="text-xs font-bold uppercase text-[var(--text-tertiary)] mb-2">Description</h4>
                          <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{event.description}</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--card-border)]">
                          <div className="text-[10px] text-[var(--text-tertiary)]">
                            Posted by ID: {event.postedBy}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-[var(--accent)] hover:text-[var(--accent-hover)] h-8"
                              onClick={() => navigate(`/events/${event.id}`)}
                            >
                              View Page
                            </Button>
                            {event.verificationStatus !== 'verified' && (
                              <Button 
                                size="sm" 
                                className="bg-emerald-500 hover:bg-emerald-600 text-white h-8"
                                onClick={() => handleStatusChange(event, 'verified')}
                              >
                                <Check className="w-4 h-4 mr-1" /> Approve
                              </Button>
                            )}
                            {event.verificationStatus !== 'rejected' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-red-500/20 text-red-500 hover:bg-red-500/10 h-8"
                                onClick={() => handleStatusChange(event, 'rejected')}
                              >
                                <X className="w-4 h-4 mr-1" /> Decline
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-gray-500 h-8"
                              onClick={() => handleDelete(event.id!)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
