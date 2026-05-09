import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { BackButton } from '../../components/ui/BackButton';
import { MapPin, Calendar, Clock, ExternalLink, Users, AlertCircle, Compass, Trash2 } from 'lucide-react';
import { Event } from '../../types';
import toast from 'react-hot-toast';
import ReportButton from '../../components/ReportButton';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [poster, setPoster] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'events', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Event;
          setEvent({ id: docSnap.id, ...data });
          
          if (data.postedBy) {
            const posterDoc = await getDoc(doc(db, 'users', data.postedBy));
            if (posterDoc.exists()) {
              setPoster(posterDoc.data());
            }
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const handleRegistrationToggle = async () => {
    if (!userData || !event || !id) return;
    setRegistering(true);
    
    const isRegistered = event.registeredUsers?.includes(userData.uid);
    const docRef = doc(db, 'events', id);
    
    try {
      if (isRegistered) {
        await updateDoc(docRef, {
          registeredUsers: arrayRemove(userData.uid)
        });
        setEvent(prev => prev ? { ...prev, registeredUsers: prev.registeredUsers.filter(u => u !== userData.uid) } : null);
        toast.success("You are no longer registered for this event.");
      } else {
        await updateDoc(docRef, {
          registeredUsers: arrayUnion(userData.uid)
        });
        setEvent(prev => prev ? { ...prev, registeredUsers: [...(prev.registeredUsers || []), userData.uid] } : null);
        toast.success("Successfully registered for the event!");
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update registration status');
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    if (!id) return;

    const toastId = toast.loading('Deleting event...');
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success('Event deleted successfully', { id: toastId });
      navigate('/events');
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || 'Failed to delete event', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center flex-col items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mb-4"></div>
        <p className="text-[var(--text-secondary)]">Loading Event...</p>
      </div>
    );
  }

  if (!event || (event.verificationStatus !== 'verified' && userData?.role !== 'admin' && userData?.uid !== event.postedBy)) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 text-center pt-20">
        {event?.verificationStatus === 'pending' ? (
          <>
            <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Event Pending Verification</h2>
            <p className="text-[var(--text-secondary)] mb-6">This event is currently being reviewed by our administrators.</p>
          </>
        ) : (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
            <p className="text-[var(--text-secondary)] mb-6">This event may have been deleted or declined.</p>
          </>
        )}
        <BackButton />
      </div>
    );
  }

  const dateObj = new Date(event.date);
  const isUpcoming = dateObj > new Date();
  const isRegistered = userData && event.registeredUsers?.includes(userData.uid);
  const isHost = userData?.uid === event.postedBy;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <BackButton />
      
      <Card className="overflow-hidden border-[var(--card-border)] bg-[var(--card-bg)] shadow-md">
        <div className="h-40 bg-gradient-to-r from-teal-900/40 to-indigo-900/40 relative">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-4 left-6 md:left-8 flex gap-2">
            <div className="bg-[var(--accent)] text-black text-sm font-bold px-3 py-1 rounded-full flex items-center shadow-lg">
              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </div>
            {event.verificationStatus !== 'verified' && (
              <div className={`text-white text-sm font-bold px-3 py-1 rounded-full flex items-center shadow-lg ${
                event.verificationStatus === 'pending' ? 'bg-yellow-600' : 'bg-red-600'
              }`}>
                {event.verificationStatus?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between gap-6 items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                 <h1 className="text-3xl md:text-4xl font-bold">{event.title}</h1>
                 <div className="flex items-center gap-2">
                   {(userData?.uid === event.postedBy || userData?.role === 'admin') && (
                     <button 
                       onClick={handleDeleteEvent}
                       className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                       title="Delete Event"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                   )}
                   <ReportButton targetId={event.id!} targetType="event" />
                 </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[var(--text-secondary)] mb-6">
                <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--card-border)]">
                  <Calendar className="w-5 h-5 text-[var(--accent)]" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Date</p>
                    <p className="font-medium text-[var(--text-primary)]">{dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--card-border)]">
                  <Clock className="w-5 h-5 text-[var(--accent)]" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Time</p>
                    <p className="font-medium text-[var(--text-primary)]">{dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--card-border)] sm:col-span-2">
                  <MapPin className="w-5 h-5 text-[var(--accent)]" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">Location</p>
                    <p className="font-medium text-[var(--text-primary)]">{event.location}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-64 shrink-0">
              {isHost ? (
                <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl font-medium text-yellow-600 dark:text-yellow-400">
                  You are the host of this event
                </div>
              ) : isUpcoming ? (
                event.registrationLink ? (
                  <Button 
                    className="w-full h-12 text-base font-semibold bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] shadow-lg shadow-[var(--accent)]/10"
                    onClick={() => window.open(event.registrationLink, '_blank')}
                  >
                    Register Externally <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    className={`w-full h-12 text-base font-semibold shadow-lg ${isRegistered 
                      ? 'bg-gray-100 dark:bg-gray-800 text-[var(--text-primary)] hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 border border-transparent hover:border-red-500/50' 
                      : 'bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] shadow-[var(--accent)]/10'}`}
                    onClick={handleRegistrationToggle}
                    isLoading={registering}
                  >
                    {isRegistered ? 'Cancel Registration' : 'Register Now'}
                  </Button>
                )
              ) : (
                <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-xl font-medium text-[var(--text-secondary)]">
                  Event has ended
                </div>
              )}
              
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-tertiary)] bg-[var(--bg-secondary)]/50 p-2 rounded-lg mt-2">
                <Users className="w-4 h-4" />
                <span className="font-medium text-[var(--text-primary)]">{event.registeredUsers?.length || 0}</span> attending
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-[var(--card-border)] bg-[var(--card-bg)] h-full">
            <CardContent className="p-6 md:p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Compass className="w-5 h-5 text-[var(--accent)]" /> 
                About the Event
              </h3>
              <div className="prose prose-invert max-w-none text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed mb-8">
                {event.description}
              </div>

              {(event.teamSize || (event.requiredSkills && event.requiredSkills.length > 0)) && (
                <div className="pt-6 border-t border-[var(--card-border)] grid grid-cols-1 md:grid-cols-2 gap-6">
                  {event.teamSize && (
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Team Size</h4>
                      <p className="text-lg font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5 text-yellow-500" />
                        Up to {event.teamSize} members
                      </p>
                    </div>
                  )}
                  {event.requiredSkills && event.requiredSkills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {event.requiredSkills.map(skill => (
                          <span key={skill} className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg text-xs font-bold uppercase tracking-wider">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {poster && (
            <Card className="border-[var(--card-border)] bg-[var(--card-bg)]">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Hosted By</h3>
                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate(`/profile/${poster.uid}`)}>
                  <img 
                    src={poster.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(poster.displayName || 'User')}&background=random`} 
                    alt={poster.displayName}
                    className="w-14 h-14 rounded-full ring-2 ring-transparent group-hover:ring-[var(--accent)] transition-all"
                  />
                  <div>
                    <h4 className="font-semibold text-lg group-hover:text-[var(--accent)] transition-colors">{poster.displayName}</h4>
                    <p className="text-sm text-[var(--text-secondary)] capitalize">{poster.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isRegistered && isUpcoming && !event.registrationLink && (
            <Card className="border-green-500/30 bg-green-500/10 dark:bg-green-500/5">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl text-green-600 dark:text-green-400">✓</span>
                </div>
                <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">You're going!</h3>
                <p className="text-sm text-green-600/80 dark:text-green-400/80">We'll remind you before the event starts.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
