import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, increment, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Send, Image as ImageIcon, Heart, MessageCircle, Share2, Hash, Trash2, TrendingUp, UserPlus, Zap, Bookmark, MoreHorizontal, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import ReportButton from '../../components/ReportButton';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string | null;
  content: string;
  createdAt: number;
}

interface Post {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  userPhotoURL?: string | null;
  content: string;
  image?: string;
  createdAt: any;
  likes: number;
  likedBy?: string[];
  comments: number;
  commentsList?: Comment[];
}

export default function CommunityFeed() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
         window.alert('Image is too large. Please select an image under 1MB.');
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [conns1, setConns1] = useState<string[]>([]);
  const [conns2, setConns2] = useState<string[]>([]);
  const acceptedConnections = useMemo(() => new Set([...conns1, ...conns2]), [conns1, conns2]);

  useEffect(() => {
    if (!userData?.uid) return;
    const q1 = query(collection(db, 'connections'), where('fromUserId', '==', userData.uid), where('status', '==', 'accepted'));
    const q2 = query(collection(db, 'connections'), where('toUserId', '==', userData.uid), where('status', '==', 'accepted'));

    const unsub1 = onSnapshot(q1, (snap) => {
      setConns1(snap.docs.map(d => d.data().toUserId));
    });
    const unsub2 = onSnapshot(q2, (snap) => {
      setConns2(snap.docs.map(d => d.data().fromUserId));
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [userData?.uid]);

  const handleTopicClick = () => {
    setNewPostContent(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + '#');
  };

  const handleReplyClick = async (post: Post) => {
    if (!userData || userData.uid === post.userId) return;
    
    if (!acceptedConnections.has(post.userId)) {
      toast.error('You can only message users you are connected with. Visit their profile to send a connection request.');
      return;
    }

    try {
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', userData.uid)
      );
      const snapshot = await getDocs(q);
      let existingChatId = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(post.userId)) {
          existingChatId = doc.id;
        }
      });
      if (existingChatId) {
        navigate(`/messages/${existingChatId}`);
      } else {
        const newChatRef = await addDoc(collection(db, 'chats'), {
          type: 'direct',
          participants: [userData.uid, post.userId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        navigate(`/messages/${newChatRef.id}`);
      }
    } catch (error) {
      console.error('Error handling direct reply:', error);
    }
  };

  const handleShare = async (post: Post) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.userName}`,
          text: post.content,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(`${post.userName} said: ${post.content}\n${window.location.href}`);
      alert('Link copied to clipboard!');
    }
  };

  const submitComment = async (post: Post) => {
    if (!userData) return;
    const text = commentTexts[post.id]?.trim();
    if (!text) return;

    const newComment: Comment = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: userData.uid,
      userName: userData.displayName || 'Unknown',
      userPhotoURL: userData.photoURL,
      content: text,
      createdAt: Date.now()
    };

    const postRef = doc(db, 'feed_posts', post.id);
    try {
      if (!post.commentsList) {
        // Fallback for older posts missing the array
        await updateDoc(postRef, {
          comments: increment(1),
          commentsList: [newComment]
        });
      } else {
        await updateDoc(postRef, {
          comments: increment(1),
          commentsList: arrayUnion(newComment)
        });
      }
      setCommentTexts(prev => ({ ...prev, [post.id]: '' }));
      toast.success("Comment added!");
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Error adding comment: ' + error.message);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'feed_posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      const sortedPosts = [...postsData];
      
      setPosts(sortedPosts);
    });

    return () => unsubscribe();
  }, []);

  const handlePost = async () => {
    if ((!newPostContent.trim() && !selectedImage) || !userData || isPosting) return;

    setIsPosting(true);
    try {
      await addDoc(collection(db, 'feed_posts'), {
        userId: userData.uid,
        userName: userData.displayName || 'Unknown User',
        userRole: userData.role || 'student',
        userPhotoURL: userData.photoURL,
        content: newPostContent.trim(),
        image: selectedImage,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        comments: 0
      });
      setNewPostContent('');
      setSelectedImage(null);
    } catch (error) {
      console.error('Error adding post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'feed_posts', postId));
      toast.success('Post deleted');
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const handleDeleteComment = async (post: Post, commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    const postRef = doc(db, 'feed_posts', post.id);
    const commentToDelete = post.commentsList?.find(c => c.id === commentId);
    if (!commentToDelete) return;

    try {
      await updateDoc(postRef, {
        comments: increment(-1),
        commentsList: arrayRemove(commentToDelete)
      });
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };
  const handleLike = async (post: Post) => {
    if (!userData) return;
    const postRef = doc(db, 'feed_posts', post.id);
    const hasLiked = post.likedBy?.includes(userData.uid);

    try {
      if (hasLiked) {
        await updateDoc(postRef, {
          likes: increment(-1),
          likedBy: arrayRemove(userData.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: increment(1),
          likedBy: arrayUnion(userData.uid)
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Extracting real trends from posts
  const realTrends = useMemo(() => {
    const hashtagCounts: Record<string, number> = {};
    posts.forEach(post => {
      // Simple regex to find hashtags
      const hashtags = post.content.match(/#[a-z0-9_]+/gi);
      if (hashtags) {
        hashtags.forEach(tag => {
          const normalizedTag = tag.toLowerCase();
          hashtagCounts[normalizedTag] = (hashtagCounts[normalizedTag] || 0) + 1;
        });
      }
    });

    return Object.entries(hashtagCounts)
      .map(([tag, count], index) => ({ 
        id: index, 
        tag, 
        count: count > 999 ? `${(count / 1000).toFixed(1)}k` : count.toString() 
      }))
      .sort((a, b) => parseInt(b.count) - parseInt(a.count))
      .slice(0, 5);
  }, [posts]);

  const [selectedLegalDoc, setSelectedLegalDoc] = useState<{ title: string; content: string } | null>(null);

  const legalContent: Record<string, { title: string; content: string }> = {
    'Terms': {
      title: 'Terms of Service',
      content: 'Welcome to Campus Connect AI. By using our platform, you agree to these terms: You must be a verified student or faculty member. We prioritize a safe, respectful environment. Any form of harassment or unauthorized data scraping will lead to immediate account termination. Your content is yours, but you grant us permission to host it.',
    },
    'Privacy': {
      title: 'Privacy Policy',
      content: 'At Campus Connect AI, we protect your academic and personal life. We collect minimal data: your email, name, and interactions within the feed to improve our AI relevance. We never sell your data to recruiters or third parties without your explicit consent via the Opportunities section.',
    },
    'Cookie Policy': {
      title: 'Cookie Policy',
      content: 'We use "Campus Cookies" to keep you logged in and remember your dark mode preferences. These are essential for the platform to function. We also use minimal analytics to see which threads are trending so we can optimize performance during peak campus hours.',
    },
    'Accessibility': {
      title: 'Accessibility',
      content: 'Campus Connect AI is built for everyone. We support screen readers, high-contrast gold-on-black themes, and keyboard-only navigation. If you find a component that is difficult to use, please report it via the feedback button.',
    },
    'Ads info': {
      title: 'Ads Information',
      content: 'We are currently 100% ad-free. Our mission is student connection, not ad revenue. Any sponsored posts you see will be clearly marked and will only be related to student benefits, internships, or campus events.',
    }
  };

  const SkeletonPost = () => (
    <div className="bg-white/20 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2rem] p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-white/10 rounded-2xl"></div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-white/10 rounded-lg"></div>
          <div className="h-3 w-20 bg-white/10 rounded-lg"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-white/10 rounded-lg"></div>
        <div className="h-4 w-5/6 bg-white/10 rounded-lg"></div>
      </div>
      <div className="h-64 w-full bg-white/10 rounded-[2rem]"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Center Content: Feed */}
        <div className="lg:col-span-8 space-y-8 pb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2"
          >
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-yellow-500">
                Community Feed
              </h1>
              <p className="text-[var(--text-secondary)] mt-1 font-medium">Explore what's happening in your campus.</p>
            </div>
            
            {/* Quick stats or filters could go here */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{posts.length} Active Discussions</span>
            </div>
          </motion.div>

          {/* Create Post Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden border-0 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl relative group">
              {/* Subtle background glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-yellow-500/10 blur-[80px] rounded-full group-hover:bg-yellow-500/20 transition-all duration-700"></div>
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-500 shadow-lg shadow-yellow-500/20 overflow-hidden flex items-center justify-center font-bold text-white shrink-0 ring-2 ring-white/20">
                     <img 
                       src={userData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.displayName || 'User')}&background=random`} 
                       alt={userData?.displayName || ''} 
                       className="w-full h-full object-cover" 
                     />
                  </div>
                  <div className="flex-1 space-y-4">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share a project, a result, or just say hi..."
                      className="w-full bg-transparent resize-none outline-none text-[var(--text-primary)] text-lg font-medium placeholder:text-[var(--text-tertiary)] min-h-[100px] py-2"
                    />
                    
                    <AnimatePresence>
                      {selectedImage && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative mt-4 inline-block overflow-hidden rounded-2xl group"
                        >
                          <img src={selectedImage} alt="Preview" className="max-h-72 w-full object-cover rounded-2xl" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => setSelectedImage(null)}
                              className="bg-red-500 text-white p-2.5 rounded-full hover:bg-red-600 shadow-xl transform transition-transform hover:scale-110"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--card-border)]/50">
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageSelect} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[var(--text-secondary)] hover:text-yellow-500 hover:bg-yellow-500/10 rounded-2xl h-11 px-4 transition-all"
                    >
                      <ImageIcon className="w-5 h-5 mr-2" />
                      <span className="hidden sm:inline font-semibold">Image</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleTopicClick}
                      className="text-[var(--text-secondary)] hover:text-yellow-500 hover:bg-yellow-500/10 rounded-2xl h-11 px-4 transition-all"
                    >
                      <Hash className="w-5 h-5 mr-2" />
                      <span className="hidden sm:inline font-semibold">Topic</span>
                    </Button>
                  </div>
                  <Button 
                    onClick={handlePost} 
                    disabled={(!newPostContent.trim() && !selectedImage) || isPosting}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black shadow-xl shadow-yellow-500/20 font-bold rounded-2xl h-11 px-8 transition-all hover:translate-y-[-2px] disabled:opacity-50 disabled:translate-y-0"
                  >
                    {isPosting ? (
                      <span className="flex items-center gap-2">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                          <Send className="w-4 h-4" />
                        </motion.div>
                        Posting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Post Life <Send className="w-4 h-4 ml-1" />
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Posts List */}
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-20 p-8 rounded-[32px] border border-dashed border-[var(--card-border)] bg-white/5 dark:bg-black/5 backdrop-blur-sm">
                <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                   <MessageCircle className="w-12 h-12 text-yellow-600" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">The silence is loud!</h3>
                <p className="text-[var(--text-secondary)] max-w-sm mx-auto mt-3 text-lg">
                  Drop a thought or a picture to kickstart the conversation.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden border-0 bg-white/20 dark:bg-white/[0.03] backdrop-blur-xl shadow-xl hover:shadow-2xl hover:shadow-yellow-500/5 transition-all duration-500 group rounded-[2rem]">
                      <CardHeader className="p-6 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-yellow-500/20 group-hover:ring-yellow-500/40 transition-all duration-500 shrink-0">
                               <img 
                                 src={post.userPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.userName || 'User')}&background=random`} 
                                 alt={post.userName} 
                                 className="w-full h-full object-cover" 
                               />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-lg text-[var(--text-primary)] truncate group-hover:text-yellow-500 transition-colors">
                                  {post.userName}
                                </h3>
                                <span className="text-[10px] px-2 py-0.5 bg-yellow-500 text-black rounded-lg uppercase font-black tracking-widest shadow-sm">
                                  {post.userRole}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-[var(--text-tertiary)] flex items-center gap-1.5 mt-1">
                                {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                <span>•</span>
                                <TrendingUp className="w-3 h-3 text-yellow-500/60" />
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <ReportButton targetId={post.id} targetType="post" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            {(userData?.uid === post.userId || userData?.role === 'admin') && (
                              <button 
                                onClick={() => handleDeletePost(post.id)}
                                className="p-2 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 pt-4">
                        <div className="px-1">
                          <p className="text-[var(--text-primary)] text-lg leading-relaxed whitespace-pre-wrap font-medium">
                            {post.content}
                          </p>
                        </div>
                        
                        {post.image && (
                          <div className="mt-6 mb-2 rounded-[2rem] overflow-hidden bg-black/5 dark:bg-white/5 border border-white/10 shadow-inner group/image relative">
                            <motion.img 
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              src={post.image} 
                              alt="Post Content" 
                              className="w-full h-auto max-h-[600px] object-cover" 
                            />
                            {/* Premium overlay effect */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--card-border)]/30">
                          <div className="flex items-center gap-1 sm:gap-4">
                            <button 
                              onClick={() => handleLike(post)}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all group ${post.likedBy?.includes(userData?.uid || '') ? 'text-yellow-500 bg-yellow-500/10' : 'text-[var(--text-secondary)] hover:text-yellow-500 hover:bg-yellow-500/5'}`}
                            >
                              <motion.div whileTap={{ scale: 1.4 }}>
                                <Heart className={`w-5 h-5 ${post.likedBy?.includes(userData?.uid || '') ? 'fill-current' : 'group-hover:scale-110 transition-transform'}`} />
                              </motion.div>
                              <span className="text-sm font-bold">{post.likes || 0}</span>
                            </button>
                            
                            <button 
                              onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-500/5 transition-all group"
                            >
                              <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              <span className="text-sm font-bold">{post.comments || 0}</span>
                            </button>

                            {userData?.uid !== post.userId && (
                              <button 
                                onClick={() => handleReplyClick(post)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/5 transition-all group hidden sm:flex"
                              >
                                <Send className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-bold">Reply</span>
                              </button>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button className="p-3 text-[var(--text-secondary)] hover:text-yellow-500 hover:bg-yellow-500/5 rounded-2xl transition-all">
                              <Bookmark className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleShare(post)} className="p-3 text-[var(--text-secondary)] hover:text-yellow-500 hover:bg-yellow-500/5 rounded-2xl transition-all">
                              <Share2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedPostId === post.id && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-6 pt-6 border-t border-[var(--card-border)]/30 space-y-6">
                                <div className="space-y-4 max-h-96 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-yellow-500/20">
                                  {post.commentsList && post.commentsList.length > 0 ? (
                                    post.commentsList.map(comment => (
                                      <div key={comment.id} className="flex gap-4 group/comment">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-yellow-500/10 flex items-center justify-center font-bold text-yellow-600 shrink-0 shadow-sm border border-yellow-500/10">
                                          <img 
                                            src={comment.userPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName || 'User')}&background=random`} 
                                            alt={comment.userName} 
                                            className="w-full h-full object-cover" 
                                          />
                                        </div>
                                        <div className="flex-1 bg-white/5 dark:bg-white/[0.02] border border-white/5 p-4 rounded-3xl rounded-tl-sm relative">
                                          <div className="flex justify-between items-center mb-1.5">
                                            <span className="font-bold text-sm text-yellow-600 dark:text-yellow-400">{comment.userName}</span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                                                {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                                              </span>
                                              {(userData?.uid === comment.userId || userData?.role === 'admin') && (
                                                <button 
                                                  onClick={() => handleDeleteComment(post, comment.id)}
                                                  className="opacity-0 group-hover/comment:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">{comment.content}</p>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-6 bg-white/5 dark:bg-white/[0.02] rounded-3xl">
                                      <p className="text-sm font-semibold text-[var(--text-secondary)]">Be the first to speak your mind!</p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-3 items-center">
                                  <div className="w-10 h-10 rounded-xl overflow-hidden hidden sm:block shrink-0">
                                    <img src={userData?.photoURL || ''} alt="" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex-1 relative">
                                    <input 
                                      type="text"
                                      placeholder="Express yourself..."
                                      value={commentTexts[post.id] || ''}
                                      onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') submitComment(post);
                                      }}
                                      className="w-full bg-white/5 dark:bg-white/[0.04] border border-white/10 dark:border-white/5 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 rounded-2xl px-5 py-3 text-sm text-[var(--text-primary)] font-medium outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                                    />
                                    <button 
                                      disabled={!commentTexts[post.id]?.trim()}
                                      onClick={() => submitComment(post)}
                                      className="absolute right-2 top-1.5 p-2 text-yellow-500 hover:bg-yellow-500/10 disabled:opacity-30 rounded-xl transition-all"
                                    >
                                      <Send className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Trends & Suggestions */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-6">
          {/* Trends Sidebar */}
          <Card className="border-0 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-yellow-500" />
                </div>
                <h3 className="text-xl font-black tracking-tight italic uppercase">Trends for you</h3>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="space-y-5">
                {realTrends.length > 0 ? (
                  realTrends.map((trend) => (
                    <div key={trend.id} className="group cursor-pointer">
                      <p className="text-[10px] font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-[0.2em] mb-0.5">Trending</p>
                      <h4 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-yellow-500 transition-colors">
                        {trend.tag}
                      </h4>
                      <p className="text-xs font-bold text-[var(--text-tertiary)] mt-1">{trend.count} Posts</p>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm font-bold text-[var(--text-tertiary)] italic">No trending topics yet</p>
                    <p className="text-[10px] uppercase tracking-widest text-yellow-600/60 mt-1 font-black">Post with #hashtags to start! </p>
                  </div>
                )}
                {realTrends.length > 0 && (
                  <Button variant="ghost" className="w-full justify-start text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10 font-bold mt-2 rounded-2xl py-6">
                    Show more trends
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>


          {/* Footer stuff */}
          <div className="px-6 flex flex-wrap gap-x-4 gap-y-2">
            {['Terms', 'Privacy', 'Cookie Policy', 'Accessibility', 'Ads info'].map(text => (
              <span 
                key={text} 
                onClick={() => setSelectedLegalDoc(legalContent[text])}
                className="text-[10px] font-bold text-[var(--text-tertiary)] hover:text-yellow-500 cursor-pointer transition-colors uppercase tracking-widest"
              >
                {text}
              </span>
            ))}
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] mt-2 uppercase tracking-widest">© 2024 Campus Connect AI</p>
          </div>
        </aside>
      </div>

      {/* Legal & About Modal */}
      <AnimatePresence>
        {selectedLegalDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLegalDoc(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white/10 dark:bg-black/60 backdrop-blur-2xl border border-white/20 dark:border-yellow-500/20 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50" />
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">
                  {selectedLegalDoc.title}
                </h2>
                <button 
                  onClick={() => setSelectedLegalDoc(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="prose prose-invert max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-yellow-500/20">
                <p className="text-white/80 leading-relaxed font-medium text-lg italic">
                  {selectedLegalDoc.content}
                </p>
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-[10px] font-bold text-yellow-500/40 uppercase tracking-[0.2em]">
                    Official Campus Connect AI Governance • 2024
                  </p>
                </div>
              </div>
              <div className="mt-8">
                <Button 
                  onClick={() => setSelectedLegalDoc(null)}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black rounded-2xl h-12 uppercase"
                >
                  Understood
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
