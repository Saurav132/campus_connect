import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, onSnapshot, where, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Bot, User, Send, Sparkles, Loader2, Plus, MessageSquare, Menu, FileText, Trash2, X, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/Button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { createAiChat, sendMessageToAI } from '../../services/aiService';

export default function GlobalAiChatbot() {
  const { userData } = useAuth();
  const dragControls = useDragControls();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat list
  useEffect(() => {
    if (!userData || !isOpen) return;
    const q = query(
      collection(db, 'aiChats'), 
      where('userId', '==', userData.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setChats(data);
      if (data.length > 0 && !activeChatId) {
        setActiveChatId(data[0].id);
      }
    });
    return () => unsub();
  }, [userData, isOpen]);

  // Fetch messages for active chat
  useEffect(() => {
    if (!activeChatId || !isOpen) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, `aiChats/${activeChatId}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [activeChatId, isOpen]);

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
      setInput(`Please analyze my resume: ${e.target.files[0].name} and give me my ATS score, feedback, and what roles I'd be a good fit for.`);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    try {
      if (chatId === activeChatId) {
        setActiveChatId(null);
        setMessages([]);
      }
      await deleteDoc(doc(db, 'aiChats', chatId));
      toast.success("Chat deleted");
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64String = result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !resumeFile) || !userData) return;

    const currentInput = input.trim() || 'Please analyze the attached document.';
    let base64File = undefined;
    let mimeType = undefined;

    if (resumeFile) {
      toast.loading("Analyzing document...", { id: 'analyze_doc' });
      try {
        base64File = await fileToBase64(resumeFile);
        mimeType = resumeFile.type;
      } catch (err) {
        toast.error("Failed to read file", { id: 'analyze_doc' });
        return;
      }
    }

    setInput('');
    const storedResumeFile = resumeFile;
    setResumeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLoading(true);
    setStreamingMessage('');

    try {
      let currentChatId = activeChatId;
      
      if (!currentChatId) {
        currentChatId = await createAiChat(userData.uid, storedResumeFile ? `Analyze Resume: ${storedResumeFile.name}` : currentInput);
        setActiveChatId(currentChatId);
      }

      const history = messages.map(m => ({
        role: m.sender === 'ai' ? 'ai' : 'user',
        text: m.message
      }));

      const stream = await sendMessageToAI(currentChatId, userData.uid, currentInput, history, base64File, mimeType);
      
      if (storedResumeFile) toast.success("Document analyzed successfully!", { id: 'analyze_doc' });

      let fullResponseText = '';
      for await (const chunk of stream) {
        const text = chunk.text || "";
        fullResponseText += text;
        setStreamingMessage(fullResponseText);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }

      await addDoc(collection(db, `aiChats/${currentChatId}/messages`), {
        chatId: currentChatId,
        sender: 'ai',
        message: fullResponseText,
        createdAt: serverTimestamp()
      });

    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
        toast.error("AI Quota Exceeded. Please check your Gemini API billing and rate limits.");
      } else {
        toast.error("Failed to generate response. Please try again later.");
      }
    } finally {
      setLoading(false);
      setStreamingMessage('');
    }
  };

  return (
    <motion.div
      drag={!isExpanded}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      dragControls={dragControls}
      dragListener={!isOpen} // Only listen to drag on the whole element when collapsed
      className={`fixed z-50 pointer-events-none ${isExpanded ? 'inset-0' : 'bottom-6 right-6'}`}
      style={isExpanded ? { bottom: 0, right: 0 } : undefined}
    >
      <div className="pointer-events-auto relative w-full h-full flex flex-col items-end justify-end">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.div
              key="collapsed"
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="touch-none"
            >
              <motion.button
                onTap={() => setIsOpen(true)}
                className="w-14 h-14 rounded-full bg-yellow-500 hover:bg-yellow-400 text-white shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
              >
                <Sparkles className="w-6 h-6" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className={`flex flex-col glass-card border border-[var(--card-border)] shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded 
                  ? 'fixed inset-4 md:inset-10 rounded-2xl' 
                  : 'w-[420px] h-[600px] max-h-[85vh] rounded-2xl max-w-[calc(100vw-32px)]'
              }`}
            >
              {/* Header */}
              <div 
                onPointerDown={(e) => !isExpanded && dragControls.start(e)}
                className={`h-14 border-b border-[var(--card-border)] flex items-center justify-between px-4 bg-[var(--bg-primary)]/90 backdrop-blur-md shrink-0 ${!isExpanded ? 'cursor-move touch-none' : ''}`}
              >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)] glow-yellow flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Campus Connect AI</h3>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors text-[var(--text-secondary)] hover:text-red-500"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
              {/* Sidebar */}
              <div className={`
                absolute z-30 h-full w-64 bg-[var(--bg-secondary)] border-r border-[var(--card-border)] flex flex-col
                transition-transform duration-300 shadow-2xl
                ${isExpanded ? 'md:relative md:shadow-none' : ''}
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                ${isExpanded ? 'md:translate-x-0' : ''}
              `}>
                <div className="p-3 border-b border-[var(--card-border)]">
                  <Button 
                    onClick={handleNewChat}
                    className="w-full justify-start gap-2 bg-[var(--bg-primary)] text-xs"
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-3 h-3" /> New Chat
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                  {chats.map(chat => (
                    <div
                      key={chat.id}
                      onClick={() => { setActiveChatId(chat.id); setSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between group transition-colors cursor-pointer ${
                        activeChatId === chat.id ? 'bg-[var(--accent)]/10 text-[var(--text-primary)]' : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden w-full">
                         <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${activeChatId === chat.id ? 'text-[var(--accent)]' : ''}`} />
                         <p className="text-xs font-medium truncate pr-2">{chat.title || "New Chat"}</p>
                      </div>
                      <button 
                         onClick={(e) => handleDeleteChat(e, chat.id)}
                         className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)]">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {!activeChatId && messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mb-4">
                        <Bot className="w-6 h-6 text-[var(--accent)]" />
                      </div>
                      <h4 className="font-bold text-lg mb-2">How can I help?</h4>
                      <p className="text-sm text-[var(--text-secondary)] px-4 mb-6">
                        Analyze resumes, get roadmap ideas, or find opportunities.
                      </p>
                      <div className="flex flex-col gap-2 w-full max-w-[240px]">
                        <button onClick={() => setInput("Generate a learning roadmap to become a Frontend Developer")} className="text-xs p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--card-border)] rounded-lg text-left transition-colors">
                          🛣️ Generate a roadmap
                        </button>
                        <button onClick={() => setInput("Find internship opportunities")} className="text-xs p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--card-border)] rounded-lg text-left transition-colors">
                          💼 Find internships
                        </button>
                      </div>
                    </div>
                  )}

                  {messages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.sender === 'user' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-[var(--accent)] text-black'}`}>
                        {msg.sender === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                      </div>
                      <div className={`p-3 rounded-2xl ${
                        msg.sender === 'user' 
                          ? 'bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-tr-sm' 
                          : 'bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-tl-sm'
                      }`}>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--text-primary)] text-sm [&>p]:mb-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.message}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}

                  {loading && streamingMessage && (
                    <div className="flex gap-2 max-w-[85%]">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 bg-[var(--accent)] text-black">
                        <Bot className="w-3 h-3" />
                      </div>
                      <div className="p-3 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-tl-sm">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--text-primary)] text-sm [&>p]:mb-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {streamingMessage + " ▋"}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}

                  {loading && !streamingMessage && (
                    <div className="flex gap-2 max-w-[85%]">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-[var(--accent)] text-black">
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-2" />
                </div>

                <div className="p-3 border-t border-[var(--card-border)] bg-[var(--bg-primary)]">
                  <form onSubmit={handleSend} className="flex flex-col gap-2">
                    {resumeFile && (
                      <div className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-md">
                        <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span className="text-[10px] font-medium truncate flex-1">{resumeFile.name}</span>
                        <button type="button" onClick={() => setResumeFile(null)} className="text-[var(--text-secondary)] hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-secondary)] ${isExpanded ? 'md:hidden' : ''}`}
                      >
                        <Menu className="w-4 h-4" />
                      </button>
                      
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx" />
                      <button 
                        type="button"
                        className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload Document"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <div className="relative flex-1">
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSend(e);
                            }
                          }}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl py-2.5 pl-3 pr-10 focus:outline-none focus:border-[var(--accent)] text-sm resize-none h-[40px] overflow-hidden"
                          placeholder="Ask AI..."
                          disabled={loading}
                        />
                        <button
                          type="submit"
                          disabled={loading || (!input.trim() && !resumeFile)}
                          className="absolute right-1.5 top-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black rounded-lg w-7 h-7 flex items-center justify-center disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 ml-0.5" />}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* Mobile Sidebar Overlay */}
              {sidebarOpen && (
                <div 
                  className={`absolute inset-0 bg-black/50 z-20 ${isExpanded ? 'md:hidden' : ''}`} 
                  onClick={() => setSidebarOpen(false)} 
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}
