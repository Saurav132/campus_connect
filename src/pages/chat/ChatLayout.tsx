import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Chat } from '../../types';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

export default function ChatLayout() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const { chatId } = useParams();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!userData?.uid) return;

    // Listen to chats where user is a participant
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userData.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const activeChats: Chat[] = [];
      const userIdsToFetch = new Set<string>();

      snapshot.forEach(d => {
        const data = d.data() as Chat;
        activeChats.push({ ...data, id: d.id });
        data.participants.forEach(p => {
          if (p !== userData.uid) userIdsToFetch.add(p);
        });
      });

      // Sort chats by last activity
      activeChats.sort((a, b) => {
        const timeA = a.lastMessageAt?.seconds || a.createdAt?.seconds || 0;
        const timeB = b.lastMessageAt?.seconds || b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setChats(activeChats);
      setLoading(false);

      if (userIdsToFetch.size > 0) {
        const newProfiles: Record<string, any> = {};
        for (const uid of userIdsToFetch) {
          const uDoc = await getDoc(doc(db, 'users', uid));
          if (uDoc.exists()) {
            newProfiles[uid] = uDoc.data();
          }
        }
        setProfiles(prev => ({ ...prev, ...newProfiles }));
      }
    });

    return () => unsubscribe();
  }, [userData?.uid]);

  const getChatDisplay = (chat: Chat) => {
    if (chat.type === 'project') {
      return {
        title: chat.contextTitle || 'Project Team',
        subtitle: `${chat.participants.length} members`,
        image: 'https://www.gravatar.com/avatar/0?d=identicon' // placeholder for group
      };
    } else {
      const otherUserId = chat.participants.find(id => id !== userData?.uid);
      const profile = otherUserId ? profiles[otherUserId] : null;
      return {
        title: profile?.displayName || 'Unknown User',
        subtitle: chat.contextTitle ? `Re: ${chat.contextTitle}` : 'Direct Message',
        image: profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.displayName || 'User')}&background=random`
      };
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden absolute inset-0">
      {/* Sidebar: Chat List */}
      <div className={cn(
        "w-full sm:w-80 lg:w-96 border-r border-[var(--card-border)] bg-[var(--bg-primary)] flex flex-col z-10 shrink-0",
        chatId ? "hidden sm:flex" : "flex"
      )}>
        <div className="p-4 border-b border-[var(--card-border)]">
          <h2 className="text-xl font-bold">Messages</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center p-8 text-[var(--text-secondary)] text-sm">
              No messages yet
            </div>
          ) : (
            chats.map(chat => {
              const display = getChatDisplay(chat);
              const isActive = chatId === chat.id;
              // Check if unread (simple heuristic: last sender wasn't me, and I haven't read it?)
              // Real unread logic would require 'readBy' arrays on the chat or lastMessage
              return (
                <div 
                  key={chat.id}
                  onClick={() => navigate(`/messages/${chat.id}`)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors mb-1",
                    isActive ? "bg-[var(--accent)]/10" : "hover:bg-[var(--bg-secondary)]"
                  )}
                >
                  <img src={display.image} alt={display.title} className="w-12 h-12 rounded-full object-cover shrink-0 border border-[var(--card-border)]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={cn("font-semibold text-sm truncate", isActive && "text-[var(--accent)]")}>
                        {display.title}
                      </h3>
                      {chat.lastMessageAt && (
                        <span className="text-[10px] text-[var(--text-tertiary)] shrink-0 ml-2">
                           {new Date(chat.lastMessageAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {chat.type === 'direct' && chat.contextTitle && (
                       <p className="text-[10px] uppercase tracking-wider text-[var(--accent)] truncate mt-0.5 mb-0.5">
                         {display.subtitle}
                       </p>
                    )}
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {chat.lastMessage || 'Joined chat'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-[var(--bg-primary)] h-full overflow-hidden relative",
        !chatId && "hidden sm:flex"
      )}>
        <Outlet />
      </div>
    </div>
  );
}
