import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, DollarSign, Briefcase, Plus, X, ExternalLink, MessageCircle, Trash2 } from 'lucide-react';
import ReportButton from '../../components/ReportButton';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Opportunity } from '../../types';

export default function Opportunities() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  // New Post State
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState('internship');
  const [location, setLocation] = useState('');
  const [stipend, setStipend] = useState('');
  const [skills, setSkills] = useState('');
  const [description, setDescription] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [applicationLink, setApplicationLink] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Opportunity[];
      setOpportunities(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || (userData.role !== 'alumni' && userData.role !== 'admin' && userData.role !== 'mentor')) {
      toast.error('Only alumni can post opportunities');
      return;
    }

    if (!title || !company || !location || !description || !eligibility) {
      toast.error('Please fill required fields');
      return;
    }

    setPosting(true);
    try {
      const newOpp = {
        title,
        company,
        type,
        location,
        stipend: stipend || 'Not specified',
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        description,
        eligibility,
        applicationLink,
        postedBy: userData.uid,
        status: 'open',
        createdAt: serverTimestamp()
      };

      const newDocRef = await addDoc(collection(db, 'opportunities'), newOpp);
      
      // Notify connections
      import('../../services/notificationService').then(({ notifyConnections }) => {
        notifyConnections(
          userData.uid,
          newDocRef.id,
          'opportunity',
          `/opportunities/${newDocRef.id}`,
          `posted a new opportunity: ${title} at ${company}`
        );
      });
      
      toast.success('Opportunity posted!');
      setIsPostModalOpen(false);
      
      // Reset
      setTitle(''); setCompany(''); setLocation(''); setStipend('');
      setSkills(''); setDescription(''); setEligibility(''); setApplicationLink('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to post opportunity');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteOpportunity = async (e: React.MouseEvent, oppId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this opportunity?')) return;
    try {
      await deleteDoc(doc(db, 'opportunities', oppId));
      toast.success('Opportunity deleted');
    } catch (error) {
      toast.error('Failed to delete opportunity');
    }
  };

  const filtered = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          opp.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || opp.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opportunities Portal</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Discover internships, jobs, and referrals from peers and alumni.
          </p>
        </div>
        {(userData?.role === 'alumni' || userData?.role === 'admin' || userData?.role === 'mentor') && (
          <Button 
            onClick={() => setIsPostModalOpen(true)}
            className="flex items-center gap-2 bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)]"
          >
            <Plus className="w-4 h-4" />
            Post Opportunity
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-1 overflow-x-auto no-scrollbar">
          {['all', 'internship', 'job', 'referral', 'freelance'].map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedType === t 
                  ? 'bg-[var(--accent)] text-black' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
             <Card key={i} className="h-64 animate-pulse flex flex-col p-6 border-transparent">
               <div className="flex items-start gap-4 mb-4">
                 <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 shrink-0" />
                 <div className="flex-1 space-y-2">
                   <div className="w-3/4 h-5 bg-black/10 dark:bg-white/10 rounded-md" />
                   <div className="w-1/2 h-4 bg-black/10 dark:bg-white/10 rounded-md" />
                 </div>
                 <div className="w-20 h-6 rounded-full bg-black/10 dark:bg-white/10 shrink-0" />
               </div>
               <div className="flex gap-4 mb-4">
                 <div className="w-24 h-4 bg-black/10 dark:bg-white/10 rounded-md" />
                 <div className="w-24 h-4 bg-black/10 dark:bg-white/10 rounded-md" />
               </div>
               <div className="w-full h-12 bg-black/5 dark:bg-white/5 rounded-md mb-4" />
               <div className="flex gap-2 mt-auto">
                 <div className="w-16 h-6 rounded-md bg-black/5 dark:bg-white/5" />
                 <div className="w-16 h-6 rounded-md bg-black/5 dark:bg-white/5" />
               </div>
             </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[var(--card-border)] rounded-2xl bg-[var(--card-bg)]/50">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">No opportunities found</h3>
          <p className="text-[var(--text-secondary)]">Try adjusting your filters or be the first to post!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map(opp => (
            <motion.div
              key={opp.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="h-full flex flex-col hover:border-[var(--accent)]/50 transition-colors cursor-pointer" onClick={() => navigate(`/opportunities/${opp.id}`)}>
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl font-bold">
                        {opp.company.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{opp.title}</h3>
                        <p className="text-[var(--text-secondary)] font-medium">{opp.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        opp.type === 'internship' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        opp.type === 'job' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                        opp.type === 'referral' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                        'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                      }`}>
                        {opp.type.charAt(0).toUpperCase() + opp.type.slice(1)}
                      </span>
                      <ReportButton targetId={opp.id} targetType="opportunity" />
                      {(userData?.uid === opp.postedBy || userData?.role === 'admin') && (
                        <button 
                          onClick={(e) => handleDeleteOpportunity(e, opp.id)}
                          className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)] mb-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> {opp.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" /> {opp.stipend}
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 flex-1 mb-4">
                    {opp.description}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-4 mt-auto border-t border-[var(--card-border)]">
                    {opp.skills.slice(0, 3).map((skill, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-[var(--text-tertiary)] font-medium">
                        {skill}
                      </span>
                    ))}
                    {opp.skills.length > 3 && (
                      <span className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-[var(--text-tertiary)] font-medium">
                        +{opp.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Post Modal */}
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
                <h2 className="text-xl font-bold">Post an Opportunity</h2>
                <button onClick={() => setIsPostModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handlePost} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Job/Role Title <span className="text-red-500">*</span></label>
                      <input 
                        required type="text" value={title} onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                        placeholder="e.g. Frontend Developer Intern"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company Name <span className="text-red-500">*</span></label>
                      <input 
                        required type="text" value={company} onChange={e => setCompany(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                        placeholder="e.g. Google, Startup Inc"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <select 
                        value={type} onChange={e => setType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all appearance-none"
                      >
                        <option value="internship">Internship</option>
                        <option value="job">Full-time Job</option>
                        <option value="referral">Referral</option>
                        <option value="freelance">Freelance</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Location <span className="text-red-500">*</span></label>
                      <input 
                        required type="text" value={location} onChange={e => setLocation(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                        placeholder="e.g. Remote, Bangalore"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Stipend/Salary</label>
                      <input 
                        type="text" value={stipend} onChange={e => setStipend(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                        placeholder="e.g. ₹20k/month or Unpaid"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Required Skills (Comma separated)</label>
                      <input 
                        type="text" value={skills} onChange={e => setSkills(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                        placeholder="e.g. React, Node.js, TypeScript"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Application Link (Optional)</label>
                      <input 
                        type="url" value={applicationLink} onChange={e => setApplicationLink(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea 
                      required value={description} onChange={e => setDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all h-20 resize-none"
                      placeholder="Describe the role and responsibilities..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Eligibility</label>
                    <textarea 
                      required value={eligibility} onChange={e => setEligibility(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] focus:ring-2 focus:ring-[var(--accent)]/50 focus:outline-none transition-all h-16 resize-none"
                      placeholder="e.g. Open to 3rd and 4th year CSE students"
                    />
                  </div>

                  <div className="pt-4 border-t border-[var(--card-border)] flex justify-end gap-3 sticky bottom-0 bg-[var(--bg-primary)] pb-2 mt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsPostModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={posting} className="bg-[var(--accent)] text-black font-semibold hover:bg-[var(--accent-hover)] px-8 shadow-lg shadow-[var(--accent)]/20">
                      Post Opportunity
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
