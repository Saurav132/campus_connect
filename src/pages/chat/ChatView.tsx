import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Chat, Message } from '../../types';
import { ArrowLeft, Send, Image as ImageIcon, Loader2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';

export default function ChatView() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  
  const [text, setText] = useState(location.state?.defaultText || '');
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId || !userData?.uid) return;

    const unsubChat = onSnapshot(doc(db, 'chats', chatId), async (docSnap) => {
      if (docSnap.exists()) {
        const c = docSnap.data() as Chat;
        setChat({ ...c, id: docSnap.id });
        
        // Fetch profiles
        const uidsToFetch = c.participants.filter(id => id !== userData.uid);
        const newProfiles: Record<string, any> = {};
        for (const uid of uidsToFetch) {
          if (!profiles[uid]) {
            const uDoc = await getDoc(doc(db, 'users', uid));
            if (uDoc.exists()) newProfiles[uid] = uDoc.data();
          }
        }
        if (Object.keys(newProfiles).length > 0) {
          setProfiles(prev => ({ ...prev, ...newProfiles }));
        }
      }
      setLoading(false);
    });

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsubMsgs = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(d => msgs.push({ ...d.data(), id: d.id } as Message));
      setMessages(msgs);
      setLoadingMsgs(false);
      setTimeout(() => scrollToBottom(), 100);
    });

    return () => {
      unsubChat();
      unsubMsgs();
    };
  }, [chatId, userData?.uid]); // eslint-disable-line

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !selectedImage) return;
    if (!userData?.uid || !chatId) return;

    setIsSending(true);
    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImageToCloudinary(selectedImage);
      }

      const newMsg = {
        chatId,
        senderId: userData.uid,
        text: text.trim(),
        imageUrl,
        createdAt: serverTimestamp(),
        readBy: [userData.uid]
      };

      await addDoc(collection(db, `chats/${chatId}/messages`), newMsg);
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: imageUrl && !text.trim() ? "Sent an image" : text.trim(),
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: userData.uid
      });

      // Simple notification to other participants (optional: check if online/unread)
      if (chat) {
        const others = chat.participants.filter(id => id !== userData.uid);
        for(const otherId of others) {
          // Add unread notification logic if needed
           await addDoc(collection(db, 'notifications'), {
            userId: otherId,
            senderId: userData.uid,
            type: 'new_message',
            contextId: chatId,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }

      setText('');
      clearImage();
      scrollToBottom();
    } catch (error) {
       console.error(error);
       alert("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>;
  }

  if (!chat) {
    return <div className="flex-1 flex items-center justify-center">Chat not found</div>;
  }

  let title = "Chat";
  let subtitle = "";
  let avatar = "https://ui-avatars.com/api/?name=Chat&background=random";

  if (chat.type === 'project') {
    title = chat.contextTitle || "Project Team";
    subtitle = `${chat.participants.length} team members`;
    avatar = "https://www.gravatar.com/avatar/0?d=identicon";
  } else {
    const otherId = chat.participants.find(id => id !== userData?.uid);
    const profile = otherId ? profiles[otherId] : null;
    title = profile?.displayName || "Unknown User";
    subtitle = profile?.role || "";
    avatar = profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=random`;
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-[var(--card-border)] bg-[var(--bg-primary)]/80 backdrop-blur-md shrink-0 z-10 sticky top-0">
        <button 
          onClick={() => navigate('/messages')}
          className="mr-3 sm:hidden p-2 rounded-full hover:bg-[var(--bg-secondary)]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <img src={avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-[var(--card-border)]" />
        
        <div className="ml-3 flex-1 min-w-0">
          <h2 className="font-bold text-[var(--text-primary)] truncate leading-tight">{title}</h2>
          <div className="text-xs text-[var(--text-secondary)] truncate flex items-center gap-2">
            {subtitle}
            {chat.type === 'direct' && chat.contextTitle && (
              <span className="bg-[var(--accent)]/10 text-[var(--accent)] px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold">
                Re: {chat.contextTitle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-4">
        {chat.contextTitle && (
          <div className="flex justify-center mb-8 mt-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--card-border)] px-4 py-2 rounded-full text-xs text-[var(--text-secondary)] flex items-center gap-2 max-w-sm text-center shadow-sm">
              <Info className="w-4 h-4 shrink-0 text-[var(--accent)]" />
              <span>This chat was started regarding <strong className="text-[var(--text-primary)]">{chat.contextTitle}</strong>.</span>
            </div>
          </div>
        )}
        
        {loadingMsgs ? (
           <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-[var(--text-secondary)] mt-10">
            <p>Say hello to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === userData?.uid;
            const senderProfile = isMe ? null : profiles[msg.senderId];
            const showName = chat.type === 'project' && !isMe;
            
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex items-end gap-2 max-w-[85%]", isMe ? "ml-auto flex-row-reverse" : "")}
              >
                {!isMe && (
                   <img 
                    src={senderProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderProfile?.displayName || 'User')}&background=random`} 
                    alt="sender" 
                    className="w-6 h-6 rounded-full object-cover shrink-0 mb-1"
                   />
                )}
                
                <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                  {showName && <span className="text-[10px] text-[var(--text-tertiary)] mb-0.5 ml-1">{senderProfile?.displayName || 'User'}</span>}
                  
                  <div className={cn(
                    "rounded-2xl px-4 py-2 text-sm shadow-sm",
                    isMe ? "bg-[var(--accent)] text-black rounded-br-sm" : "bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-bl-sm"
                  )}>
                    {msg.imageUrl && (
                      <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img 
                          src={msg.imageUrl} 
                          alt="attached" 
                          className="max-w-[200px] sm:max-w-[250px] max-h-[250px] rounded-xl object-contain mb-2 cursor-pointer border border-black/10 dark:border-white/10" 
                        />
                      </a>
                    )}
                    {msg.text && <p className="whitespace-pre-wrap word-break-words break-words">{msg.text}</p>}
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] mt-1">
                    {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                  </span>
                </div>
              </motion.div>
            )
          })
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input */}
      <div className="p-4 bg-[var(--bg-primary)] border-t border-[var(--card-border)] z-10 shrink-0">
        <form onSubmit={sendMessage} className="flex flex-col gap-2 relative">
          {imagePreview && (
            <div className="absolute bottom-full mb-3 left-0 bg-[var(--bg-secondary)] border border-[var(--card-border)] p-2 rounded-xl shadow-lg">
              <button 
                type="button" 
                onClick={clearImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
              >
                <X className="w-3 h-3" />
              </button>
              <img src={imagePreview} alt="preview" className="h-24 w-auto object-cover rounded-lg" />
            </div>
          )}

          <div className="flex items-end gap-2 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-2xl p-2 transition-colors focus-within:border-[var(--accent)]/50 focus-within:ring-1 focus-within:ring-[var(--accent)]/50">
            <input 
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:p-2.5 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors rounded-xl hover:bg-[var(--bg-primary)] shrink-0"
              disabled={isSending}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <textarea 
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 max-h-32 min-h-[40px] bg-transparent resize-none py-2.5 px-2 focus:outline-none text-sm placeholder:text-[var(--text-tertiary)]"
            />
            <button
              type="submit"
              disabled={(!text.trim() && !selectedImage) || isSending}
              className="p-2.5 bg-[var(--accent)] text-black rounded-xl hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
