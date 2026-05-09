import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '../ui/Button';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';

import toast from 'react-hot-toast';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProfileModal({ isOpen, onClose, onSuccess }: EditProfileModalProps) {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: userData?.displayName || '',
    role: userData?.role || 'student',
    department: userData?.department || '',
    passOutYear: userData?.passOutYear || '',
    yearOfStudy: userData?.yearOfStudy || '',
    company: userData?.company || '',
    position: userData?.position || '',
    bio: userData?.bio || '',
    skills: userData?.skills?.join(', ') || '',
    github: userData?.github || '',
    linkedin: userData?.linkedin || '',
    openToOpportunities: userData?.openToOpportunities || false,
  });

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.uid) return;
    setLoading(true);

    try {
      let photoURL = userData.photoURL;
      let coverImage = userData.coverImage;

      if (profileImageFile) {
        photoURL = await uploadImageToCloudinary(profileImageFile);
      }
      if (coverImageFile) {
        coverImage = await uploadImageToCloudinary(coverImageFile);
      }

      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);

      const userRef = doc(db, 'users', userData.uid);
      
      const updateData: any = {
        ...formData,
        skills: skillsArray,
        updatedAt: new Date().toISOString()
      };
      
      if (photoURL !== undefined) updateData.photoURL = photoURL;
      if (coverImage !== undefined) updateData.coverImage = coverImage;

      await updateDoc(userRef, updateData);

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[var(--bg-primary)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-[var(--card-border)]">
            <h2 className="text-xl font-bold">Edit Profile</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Profile Picture</label>
                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-[var(--card-border)] rounded-2xl bg-black/5 dark:bg-white/5 relative overflow-hidden group cursor-pointer hover:border-yellow-400 transition-colors">
                   <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                       if (file.size > 800 * 1024) {
                         alert('Image must be less than 800KB.');
                         return;
                       }
                       setProfileImageFile(file);
                     }
                   }} />
                   {profileImageFile ? (
                     <img src={URL.createObjectURL(profileImageFile)} alt="Preview" className="w-24 h-24 rounded-full object-cover" />
                   ) : userData?.photoURL ? (
                     <img src={userData.photoURL} alt="Current" className="w-24 h-24 rounded-full object-cover" />
                   ) : (
                     <div className="flex flex-col items-center">
                       <Upload className="w-6 h-6 text-yellow-500 mb-2" />
                       <span className="text-sm font-medium">Upload Image</span>
                     </div>
                   )}
                </div>
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Cover Image</label>
                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-[var(--card-border)] rounded-2xl bg-black/5 dark:bg-white/5 relative overflow-hidden group cursor-pointer hover:border-yellow-400 transition-colors">
                   <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                       if (file.size > 800 * 1024) {
                         alert('Cover image must be less than 800KB.');
                         return;
                       }
                       setCoverImageFile(file);
                     }
                   }} />
                   {coverImageFile ? (
                     <div className="relative w-full h-full">
                       <img src={URL.createObjectURL(coverImageFile)} alt="Preview" className="w-full h-full object-cover" />
                       <button 
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           setCoverImageFile(null);
                         }}
                         className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors z-20"
                       >
                         <X className="w-4 h-4" />
                       </button>
                     </div>
                   ) : userData?.coverImage ? (
                     <div className="relative w-full h-full">
                       <img src={userData.coverImage} alt="Current" className="w-full h-full object-cover" />
                       <button 
                         type="button"
                         onClick={async (e) => {
                           e.stopPropagation();
                           if (confirm('Are you sure you want to remove your cover photo?')) {
                             try {
                               setLoading(true);
                               const userRef = doc(db, 'users', userData.uid);
                               await updateDoc(userRef, { coverImage: null });
                               toast.success('Cover photo removed');
                               onSuccess();
                             } catch (err) {
                               toast.error('Failed to remove cover photo');
                             } finally {
                               setLoading(false);
                             }
                           }
                         }}
                         className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors z-20"
                       >
                         <X className="w-4 h-4" />
                       </button>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center">
                       <Upload className="w-6 h-6 text-yellow-500 mb-2" />
                       <span className="text-sm font-medium">Upload Cover</span>
                     </div>
                   )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Full Name</label>
                <input required type="text" name="displayName" value={formData.displayName} onChange={handleChange} className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)] focus:outline-none focus:border-yellow-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Role</label>
                <input type="text" name="role" value={formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} disabled className="w-full p-3 rounded-xl bg-black/10 dark:bg-white/10 border border-[var(--card-border)] text-[var(--text-secondary)] cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Department</label>
                <select name="department" value={formData.department} onChange={handleChange} className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)] focus:outline-none focus:border-yellow-500 text-[var(--text-primary)] appearance-none">
                  <option value="" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">Select Department</option>
                  <option value="MCA" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">MCA</option>
                  <option value="Civil" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">Civil</option>
                  <option value="CSE" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">CSE</option>
                  <option value="AIML" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">AIML</option>
                  <option value="ECE" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">ECE</option>
                  <option value="EE" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">EE</option>
                  <option value="BT" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">BT</option>
                  <option value="ME" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">ME</option>
                </select>
              </div>

              {formData.role === 'student' ? (
                <div>
                  <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Year of Study</label>
                  <select name="yearOfStudy" value={formData.yearOfStudy} onChange={handleChange} className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)] focus:outline-none focus:border-yellow-500 text-[var(--text-primary)] appearance-none">
                    <option value="" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">Select Year</option>
                    <option value="1" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">1st Year</option>
                    <option value="2" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">2nd Year</option>
                    {formData.department !== 'MCA' && (
                      <>
                        <option value="3" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">3rd Year</option>
                        <option value="4" className="bg-white dark:bg-gray-900 text-[var(--text-primary)]">4th Year</option>
                      </>
                    )}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Pass Out Year</label>
                  <input type="text" name="passOutYear" value={formData.passOutYear} onChange={handleChange} placeholder="e.g. 2025" className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)] focus:outline-none focus:border-yellow-500" />
                </div>
              )}

              {formData.role !== 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Company (Current)</label>
                    <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="e.g. Google" className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)] focus:outline-none focus:border-yellow-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Position</label>
                    <input type="text" name="position" value={formData.position} onChange={handleChange} placeholder="e.g. Software Engineer" className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)] focus:outline-none focus:border-yellow-500" />
                  </div>
                </>
              )}

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Skills (comma separated)</label>
                <input type="text" name="skills" value={formData.skills} onChange={handleChange} placeholder="React, Node.js, Design" className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)] focus:outline-none focus:border-yellow-500" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Bio</label>
                <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)] focus:outline-none focus:border-yellow-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">GitHub URL</label>
                <input type="url" name="github" value={formData.github} onChange={handleChange} placeholder="https://github.com/..." className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)] focus:outline-none focus:border-yellow-500" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">LinkedIn URL</label>
                <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/..." className="w-full p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--card-border)] focus:outline-none focus:border-yellow-500" />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="flex items-center gap-3 p-4 rounded-xl border border-[var(--card-border)] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    name="openToOpportunities"
                    checked={formData.openToOpportunities}
                    onChange={handleChange}
                    className="w-5 h-5 rounded text-green-500 focus:ring-green-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  />
                  <div>
                    <span className="block text-sm font-bold text-[var(--text-primary)]">Open to Opportunities</span>
                    <span className="block text-xs text-[var(--text-secondary)]">Let others know you are looking for new roles or projects.</span>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="pt-6 border-t border-[var(--card-border)] flex justify-end gap-4">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={loading} className="min-w-[120px]">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
