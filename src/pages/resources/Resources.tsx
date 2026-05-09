import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { uploadFileToCloudinary } from '../../services/cloudinaryService';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import {
  FileText, Download, Upload, Filter,
  FileArchive, Image as ImageIcon, BookOpen, Star, File as FileIcon, FileVideo,
  X, Trash2
} from 'lucide-react';
import ReportButton from '../../components/ReportButton';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { Resource } from '../../types';

const CATEGORIES = ['MCA', 'CSE', 'Biotech', 'Electrical', 'Mechanical', 'Civil'];
const SUBCATEGORIES = ['Exam Notes', 'Subject Notes', 'Previous Year Questions', 'Assignments', 'Lab Manuals', 'Other'];

export default function Resources() {
  const { userData } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState(SUBCATEGORIES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
    
    // We filter in-memory for basic search, or we could add composite indexes in theory
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Resource[];
      setResources(resData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !description || !userData) {
      toast.error('Please fill all required fields');
      return;
    }

    setUploading(true);
    try {
      const fileUrl = await uploadFileToCloudinary(file);
      
      const newResource = {
        title,
        description,
        category,
        subcategory,
        fileUrl,
        fileType: file.type || file.name.split('.').pop() || 'unknown',
        fileSize: file.size,
        uploadedBy: userData.uid,
        uploaderRole: userData.role || 'student',
        downloads: 0,
        createdAt: serverTimestamp()
      };

      const newDocRef = await addDoc(collection(db, 'resources'), newResource);
      
      // Notify connections
      import('../../services/notificationService').then(({ notifyConnections }) => {
        notifyConnections(
          userData.uid,
          newDocRef.id,
          'resource',
          '/resources',
          `uploaded a new resource: ${title}`
        );
      });
      
      toast.success('Resource uploaded successfully!');
      setIsUploadModalOpen(false);
      
      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await deleteDoc(doc(db, 'resources', resourceId));
      toast.success('Resource deleted successfully');
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  // Filtering
  let filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          res.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? res.category === selectedCategory : true;
    const matchesSubcategory = selectedSubcategory ? res.subcategory === selectedSubcategory : true;
    
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  // Sorting: Featured first (mentors/alumni)
  filteredResources.sort((a, b) => {
    const isAFeatured = a.uploaderRole === 'mentor' || a.uploaderRole === 'alumni';
    const isBFeatured = b.uploaderRole === 'mentor' || b.uploaderRole === 'alumni';
    if (isAFeatured && !isBFeatured) return -1;
    if (!isAFeatured && isBFeatured) return 1;
    return 0; // fallback to created at order, which was descending
  });

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (type.includes('image')) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchive className="w-8 h-8 text-yellow-500" />;
    if (type.includes('video')) return <FileVideo className="w-8 h-8 text-purple-500" />;
    return <FileIcon className="w-8 h-8 text-gray-500" />;
  };

  const handleDownload = async (resource: Resource) => {
    toast.loading('Preparing download...', { id: 'download-progress' });
    try {
      // If it's a data URL, we can directly create a blob
      let blob;
      if (resource.fileUrl.startsWith('data:')) {
        const response = await fetch(resource.fileUrl);
        blob = await response.blob();
      } else {
        // For external URLs, try to fetch it but handle CORS
        const response = await fetch(resource.fileUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        blob = await response.blob();
      }
      
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Try to guess a good filename
      const filename = resource.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      let extension = '';
      if (resource.fileType.includes('/')) {
        const mimeType = resource.fileType.split('/')[1];
        if (mimeType.includes('pdf')) extension = 'pdf';
        else if (mimeType.includes('word') || mimeType.includes('docx')) extension = 'docx';
        else if (mimeType.includes('zip')) extension = 'zip';
        else if (mimeType.includes('image')) extension = mimeType.replace('jpeg', 'jpg');
        else if (mimeType.includes('video')) extension = mimeType;
        else extension = mimeType;
      } else {
        extension = resource.fileType;
      }
      
      // If extension is too long or weird, fallback to common ones
      if (extension.length > 5) {
        if (resource.fileUrl.toLowerCase().includes('.pdf')) extension = 'pdf';
        else if (resource.fileUrl.toLowerCase().includes('.docx')) extension = 'docx';
        else if (resource.fileUrl.toLowerCase().includes('.zip')) extension = 'zip';
      }
      
      link.download = extension ? `${filename}.${extension}` : filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success('Download started', { id: 'download-progress' });
    } catch (error) {
      console.error('Download failed', error);
      // Fallback
      let url = resource.fileUrl;
      if (url.includes('cloudinary.com') && !url.includes('fl_attachment')) {
        url = url.replace('/upload/', '/upload/fl_attachment/');
      }
      
      // Create a temporary link and click it to trigger browser download behavior
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = resource.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Opening download link', { id: 'download-progress' });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resource Hub</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Access and share academic notes, manuals, and more.
          </p>
        </div>
        <Button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)]"
        >
          <Upload className="w-4 h-4" />
          Upload Resource
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 appearance-none font-medium"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        <select
          value={selectedSubcategory || ''}
          onChange={(e) => setSelectedSubcategory(e.target.value || null)}
          className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 appearance-none font-medium"
        >
          <option value="">All Types</option>
          {SUBCATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Resource Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
             <Card key={i} className="h-64 animate-pulse flex flex-col p-6">
               <div className="flex items-start gap-4 mb-4">
                 <div className="w-14 h-14 bg-black/10 dark:bg-white/10 rounded-xl" />
                 <div className="flex-1 space-y-2">
                   <div className="w-3/4 h-5 bg-black/10 dark:bg-white/10 rounded-md" />
                   <div className="w-1/2 h-4 bg-black/10 dark:bg-white/10 rounded-md" />
                 </div>
               </div>
               <div className="w-full h-12 bg-black/5 dark:bg-white/5 rounded-md mt-auto" />
             </Card>
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[var(--card-border)] rounded-2xl">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium">No resources found</h3>
          <p className="text-[var(--text-secondary)]">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={resource.id}
            >
              <Card className={`h-full flex flex-col hover:border-[var(--accent)]/50 transition-colors ${
                (resource.uploaderRole === 'mentor' || resource.uploaderRole === 'alumni')
                  ? 'border-[var(--accent)] shadow-[0_0_15px_rgba(234,179,8,0.1)] relative overflow-hidden'
                  : ''
              }`}>
                    <div className="absolute top-0 right-0 p-2 flex items-center gap-1 z-10">
                      {(resource.uploaderRole === 'mentor' || resource.uploaderRole === 'alumni') && (
                        <div className="bg-[var(--accent)] text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-black" /> Verified
                        </div>
                      )}
                      {(userData?.uid === resource.uploadedBy || userData?.role === 'admin') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteResource(resource.id); }}
                          className="bg-red-500/10 text-red-500 p-1 rounded hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ReportButton targetId={resource.id} targetType="resource" />
                    </div>
                <CardContent className="p-6 flex-1 flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl shrink-0">
                      {getFileIcon(resource.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate" title={resource.title}>
                        {resource.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-[var(--text-secondary)]">
                          {resource.category}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-[var(--text-secondary)]">
                          {resource.subcategory}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 flex-1 mb-4">
                    {resource.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-4">
                    <span>{resource.fileSize ? (resource.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown size'}</span>
                    <span>{resource.downloads} downloads</span>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-[var(--card-border)]">
                    <Button 
                      variant="secondary" 
                      className="flex-1 text-sm h-9 bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 border-transparent!"
                      onClick={() => handleDownload(resource)}
                    >
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-primary)] border border-[var(--card-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between">
                <h2 className="text-xl font-bold">Upload Resource</h2>
                <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)]"
                      placeholder="e.g. Data Structures Mid Sem Notes"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea 
                      required
                      className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] h-24 resize-none"
                      placeholder="Briefly describe what this resource contains..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <select 
                        className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)]"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <select 
                        className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)]"
                        value={subcategory}
                        onChange={e => setSubcategory(e.target.value)}
                      >
                        {SUBCATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">File</label>
                    <div className="border-2 border-dashed border-[var(--card-border)] rounded-xl p-6 text-center hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        required
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                      />
                      {file ? (
                        <div className="flex flex-col items-center">
                          <FileText className="w-8 h-8 text-[var(--accent)] mb-2" />
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-[var(--text-secondary)]">
                          <Upload className="w-8 h-8 mb-2" />
                          <p className="text-sm">Click or drag file to upload</p>
                          <p className="text-xs mt-1">PDF, DOCX, PPT, ZIP (Max 10MB)</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={() => setIsUploadModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={uploading} className="bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] font-medium">
                      Upload Resource
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
