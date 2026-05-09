import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { BackButton } from '../../components/ui/BackButton';
import { MapPin, DollarSign, Calendar, ExternalLink, MessageCircle, Briefcase, Users, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Opportunity } from '../../types';
import toast from 'react-hot-toast';
import ReportButton from '../../components/ReportButton';

export default function OpportunityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [poster, setPoster] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpp = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'opportunities', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Opportunity;
          setOpportunity(data);
          
          if (data.postedBy) {
            const posterDoc = await getDoc(doc(db, 'users', data.postedBy));
            if (posterDoc.exists()) {
              setPoster(posterDoc.data());
            }
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load opportunity');
      } finally {
        setLoading(false);
      }
    };
    fetchOpp();
  }, [id]);

  const handleMessagePoster = async () => {
    if (!userData || !poster || !opportunity) return;
    if (userData.uid === poster.uid) {
      toast("You posted this opportunity.", { icon: "ℹ️" });
      return;
    }

    try {
      // Find existing direct chat
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', userData.uid)
      );
      const snapshot = await getDocs(q);
      let existingChatId = null;
      
      snapshot.forEach(d => {
        const data = d.data();
        if (data.participants.includes(poster.uid)) {
          existingChatId = d.id;
        }
      });

      if (existingChatId) {
        navigate(`/messages/${existingChatId}`, { state: { defaultText: `Hi, I am interested in this opportunity: ${opportunity.title}` } });
      } else {
        const newChatRef = await addDoc(collection(db, 'chats'), {
          type: 'direct',
          participants: [userData.uid, poster.uid],
          contextType: 'opportunity',
          contextId: opportunity.id,
          contextTitle: opportunity.title,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        navigate(`/messages/${newChatRef.id}`, { state: { defaultText: `Hi, I am interested in this opportunity: ${opportunity.title}` } });
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to start chat');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 text-center pt-20">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Opportunity Not Found</h2>
        <p className="text-[var(--text-secondary)] mb-6">This listing may have been removed or doesn't exist.</p>
        <BackButton />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <BackButton />
      
      {/* Header Card */}
      <Card className="overflow-hidden border-[var(--card-border)] bg-[var(--card-bg)] shadow-md">
        <div className="h-32 bg-gradient-to-r from-blue-900/40 to-purple-900/40 via-[var(--bg-primary)]"></div>
        <CardContent className="p-6 md:p-8 relative">
          <div className="absolute -top-12 left-6 md:left-8 w-24 h-24 bg-[var(--bg-secondary)] border-4 border-[var(--card-bg)] rounded-2xl flex items-center justify-center text-4xl font-bold shadow-xl">
            {opportunity.company.charAt(0)}
          </div>
          
          <div className="pt-16 flex flex-col md:flex-row justify-between gap-6 items-start">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">{opportunity.title}</h1>
                <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${
                  opportunity.type === 'internship' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                  opportunity.type === 'job' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                  opportunity.type === 'referral' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                  'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                }`}>
                  {opportunity.type.charAt(0).toUpperCase() + opportunity.type.slice(1)}
                </span>
                <ReportButton targetId={opportunity.id} targetType="opportunity" />
              </div>
              <p className="text-xl text-[var(--text-secondary)] font-medium mb-4">{opportunity.company}</p>
              
              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-tertiary)] font-medium">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg">
                  <MapPin className="w-4 h-4" /> {opportunity.location}
                </div>
                {opportunity.stipend && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg">
                    <DollarSign className="w-4 h-4" /> {opportunity.stipend}
                  </div>
                )}
                {opportunity.createdAt && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-lg">
                    <Calendar className="w-4 h-4" /> 
                    Posted {new Date(opportunity.createdAt.seconds * 1000).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
              {opportunity.applicationLink ? (
                <Button 
                  className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] font-semibold shadow-lg shadow-[var(--accent)]/10"
                  onClick={() => window.open(opportunity.applicationLink, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> Apply Now
                </Button>
              ) : null}
              
              {userData?.role !== 'alumni' && (
                <Button 
                  variant="outline" 
                  onClick={handleMessagePoster}
                  className="font-medium bg-white/5"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> 
                  {opportunity.applicationLink ? 'Ask a Question' : 'Message to Apply'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-[var(--card-border)] bg-[var(--card-bg)]">
            <CardContent className="p-6 md:p-8 space-y-8">
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[var(--accent)]" /> 
                  About the Role
                </h3>
                <div className="prose prose-invert max-w-none text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {opportunity.description}
                </div>
              </div>
              
              <div className="border-t border-[var(--card-border)] pt-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--accent)]" /> 
                  Eligibility
                </h3>
                <div className="prose prose-invert max-w-none text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {opportunity.eligibility}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-[var(--card-border)] bg-[var(--card-bg)]">
            <CardContent className="p-6">
              <h3 className="text-base font-bold mb-4">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {opportunity.skills.map((skill, i) => (
                  <span key={i} className="text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[var(--text-secondary)] font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {poster && (
            <Card className="border-[var(--card-border)] bg-[var(--card-bg)]">
              <CardContent className="p-6">
                <h3 className="text-base font-bold mb-4">Posted By</h3>
                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate(`/profile/${poster.uid}`)}>
                  <img 
                    src={poster.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(poster.displayName || 'User')}&background=random`} 
                    alt={poster.displayName}
                    className="w-12 h-12 rounded-full ring-2 ring-transparent group-hover:ring-[var(--accent)] transition-all"
                  />
                  <div>
                    <h4 className="font-semibold group-hover:text-[var(--accent)] transition-colors">{poster.displayName}</h4>
                    <p className="text-xs text-[var(--text-secondary)] capitalize">{poster.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {opportunity.applicationLink && (
            <Card className="border-[var(--card-border)] bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)]">
              <CardContent className="p-6 text-center">
                <LinkIcon className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Ready to apply?</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">You will be redirected to the external application page.</p>
                <Button 
                  className="w-full bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] font-medium"
                  onClick={() => window.open(opportunity.applicationLink, '_blank')}
                >
                  Apply Externally
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
