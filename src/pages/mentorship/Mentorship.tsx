import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MapPin, Briefcase, GraduationCap, Building2, User, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { BackButton } from '../../components/ui/BackButton';

interface MentorUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'student' | 'alumni' | 'mentor' | 'admin';
  company?: string;
  position?: string;
  department?: string;
  skills?: string[];
  bio?: string;
}

export default function Mentorship() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [mentors, setMentors] = useState<MentorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', 'in', ['alumni', 'mentor'])
        );
        const snapshot = await getDocs(q);
        const fetchedMentors: MentorUser[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as MentorUser;
          if (data.uid !== userData?.uid) {
            fetchedMentors.push({ ...data, uid: doc.id });
          }
        });
        setMentors(fetchedMentors);
      } catch (error) {
        console.error('Error fetching mentors:', error);
      } finally {
        setLoading(false);
      }
    };
    if (userData?.uid) {
      fetchMentors();
    }
  }, [userData]);

  const filteredMentors = mentors.filter((mentor) => {
    return (
      (mentor.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (mentor.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (mentor.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <BackButton className="hidden md:flex" />
            <h1 className="text-3xl font-bold tracking-tight">Mentorship Directory</h1>
          </div>
          <p className="text-[var(--text-secondary)] mt-1">Find guidance from experienced industry professionals.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading mentors...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.length === 0 ? (
            <div className="col-span-full text-center py-12 text-[var(--text-secondary)]">
              No mentors found.
            </div>
          ) : (
            filteredMentors.map((mentor, i) => (
              <motion.div
                key={mentor.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Card 
                  className="h-full hover:shadow-xl dark:hover:shadow-white/5 transition-all duration-300 cursor-pointer group flex flex-col overflow-hidden border-yellow-500/20"
                  onClick={() => navigate(`/profile/${mentor.uid}`)}
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-yellow-50 border-2 border-yellow-200 shrink-0 transition-transform duration-300 group-hover:scale-105">
                        <img 
                          src={mentor.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.displayName || 'User')}&background=random`} 
                          alt={mentor.displayName || 'Mentor'} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                           <h3 className="font-bold text-lg leading-tight truncate group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                             {mentor.displayName || 'Unknown Mentor'}
                           </h3>
                           <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                        </div>
                        {mentor.company && (
                          <div className="text-sm font-medium text-[var(--text-secondary)] truncate flex items-center mt-1">
                            {mentor.position} @ {mentor.company}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      {mentor.bio ? (
                        <p className="text-sm text-[var(--text-secondary)] line-clamp-3 mb-4 leading-relaxed">
                          {mentor.bio}
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--text-tertiary)] italic mb-4">No bio provided.</p>
                      )}
                      
                      {mentor.skills && mentor.skills.length > 0 && (
                         <div className="flex flex-wrap gap-1.5 mt-auto mb-4">
                           {mentor.skills.slice(0, 3).map(skill => (
                             <span key={skill} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/5 rounded-md text-[var(--text-secondary)]">
                               {skill}
                             </span>
                           ))}
                           {mentor.skills.length > 3 && (
                             <span className="px-2 py-1 text-[10px] font-bold uppercase bg-black/5 dark:bg-white/5 rounded-md text-[var(--text-secondary)]">
                               +{mentor.skills.length - 3}
                             </span>
                           )}
                         </div>
                      )}
                    </div>

                    <Button variant="outline" className="w-full border-yellow-400 text-yellow-600 dark:text-yellow-400 font-semibold group-hover:bg-yellow-500 group-hover:text-white transition-all mt-auto">
                      View Mentor Profile
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
