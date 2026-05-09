import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, X, Sparkles, Loader2, Play, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { createAiChat, sendMessageToAI } from '../../services/aiService';

export default function ResumeChecker() {
  const { userData } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!userData) return;

    // Listen to the most recent analysis
    const q = query(
      collection(db, 'resume_analyses'),
      where('userId', '==', userData.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setResult(data.result || '');
        if (data.status === 'analyzing') {
          setLoading(true);
          setCurrentAnalysisId(snapshot.docs[0].id);
        } else {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [userData]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !userData) return;
    
    setLoading(true);
    setResult('');
    toast.loading("Analyzing your resume...", { id: 'analyze_resume' });

    try {
      console.log('Starting analysis for file:', file.name, 'type:', file.type);
      const base64File = await fileToBase64(file);
      const mimeType = file.type || 'application/pdf';
      
      // Supported mime types for Gemini inlineData documents
      const supportedMimeTypes = ['application/pdf'];
      const isSupported = supportedMimeTypes.includes(mimeType);

      if (!isSupported && !mimeType.startsWith('image/')) {
        toast.error("Currently, only PDF files are supported for AI resume analysis. Please convert your file to PDF.", { id: 'analyze_resume' });
        setLoading(false);
        return;
      }
      
      const promptText = `Act as an expert ATS (Applicant Tracking System) Specialist and Career Coach. 
      Analyze the attached resume: ${file.name}.
      
      Please provide your analysis in the following structured format using Markdown:
      
      ## 📊 ATS Score: [0-100]%
      
      ### ✅ Key Strengths
      (Bullet points highlighting what was done well)
      
      ### ❌ Critical Improvements Needed
      (Specific, actionable suggestions to improve impact and formatting)
      
      ### 🚩 Potential Formatting Red Flags
      (Issues with fonts, columns, or parsing that might trip up legacy ATS)
      
      ### 🏷️ Keywords & Skills Missing
      (Important industry-specific keywords that should be included)
      
      ### 🚀 Recommended Roles
      (Roles the candidate is a strong fit for)
      
      ### 📝 Resume Optimization Tips
      (General advice for improvement)`;

      // Create record in Firestore first
      const analysisRef = await addDoc(collection(db, 'resume_analyses'), {
        userId: userData.uid,
        fileName: file.name,
        status: 'analyzing',
        result: '',
        createdAt: serverTimestamp()
      });
      
      const analysisId = analysisRef.id;
      setCurrentAnalysisId(analysisId);

      console.log('Created analysis record:', analysisId);
      const chatId = await createAiChat(userData.uid, `ATS Analysis: ${file.name}`);
      console.log('Created AI chat:', chatId);
      const stream = await sendMessageToAI(chatId, userData.uid, promptText, [], base64File, mimeType);
      
      let fullText = '';
      toast.success("Analysis started!", { id: 'analyze_resume' });
      
      for await (const chunk of stream) {
        const text = chunk.text || "";
        fullText += text;
        setResult(fullText);
        // Periodically update Firestore (less frequently to save writes)
        if (fullText.length % 200 === 0) {
           await updateDoc(doc(db, 'resume_analyses', analysisId), { result: fullText });
        }
      }

      await updateDoc(doc(db, 'resume_analyses', analysisId), { 
        result: fullText,
        status: 'completed'
      });
    } catch (error: any) {
      console.error("Resume analysis detailed error:", error);
      if (currentAnalysisId) {
        try {
          await updateDoc(doc(db, 'resume_analyses', currentAnalysisId), { status: 'error' });
        } catch (e) {
          console.error("Failed to update status on error:", e);
        }
      }
      
      let errorMessage = "Failed to analyze resume. Make sure it's a valid document.";
      if (error?.message?.includes('429') || error?.status === 429) {
        errorMessage = "AI Quota Exceeded. Please try again later.";
      } else if (error?.message?.includes('quota')) {
        errorMessage = "AI Quota Exceeded. Please try again later.";
      } else if (error?.message?.includes('permission-denied') || error?.message?.includes('insufficient permissions')) {
        errorMessage = "Database Permission error. Please contact support.";
      } else if (error?.message) {
        errorMessage = `AI Error: ${error.message.substring(0, 100)}`;
      }
      
      toast.error(errorMessage, { id: 'analyze_resume' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Sparkles className="w-6 h-6 text-black" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-500">
              AI Resume Analyzer
            </h1>
          </motion.div>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl">
            Upload your resume for an instant deep-dive analysis, ATS compatibility scoring, and actionable feedback.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start relative">
        {/* Upload Panel */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full lg:w-[420px] shrink-0 lg:sticky lg:top-24 z-10"
        >
          <div className="glass-card p-6 border border-[var(--card-border)] rounded-3xl overflow-hidden relative group shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2.5 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Upload className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Upload Center</h2>
              </div>

              {!file ? (
                <div 
                  className={`w-full min-h-[300px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all cursor-pointer ${
                    isDragOver 
                      ? 'border-yellow-500 bg-yellow-500/10 scale-[1.02]' 
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-20 h-20 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-[var(--accent)]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Select Resume</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-6 text-center leading-relaxed">
                    Drag and drop your PDF file here, or click to browse files.
                  </p>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".pdf" 
                  />
                  
                  <div className="flex flex-wrap justify-center gap-3 mt-2 opacity-60">
                    <span className="text-[10px] bg-white/10 px-2.5 py-1 rounded-md uppercase font-bold tracking-widest border border-white/5">PDF Only</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden group/file shadow-lg">
                    <div className="absolute inset-y-0 left-0 w-1.5 bg-[var(--accent)]" />
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-14 h-14 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0 border border-[var(--accent)]/20 shadow-sm">
                        <FileText className="w-8 h-8 text-[var(--accent)]" />
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="font-bold truncate text-lg tracking-tight">{file.name}</p>
                        <p className="text-sm text-[var(--text-tertiary)] font-mono flex items-center gap-2">
                          <span className="bg-white/5 px-1.5 py-0.5 rounded text-[10px]">{(file.size / 1024 / 1024).toFixed(2)} MB</span> 
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="uppercase tracking-widest text-[10px]">{file.name.split('.').pop()}</span>
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setFile(null); setResult(''); }}
                      className="p-3 hover:bg-red-500/20 rounded-2xl text-red-500 transition-all hover:scale-110 active:scale-95 shadow-sm"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
                    <div className="flex gap-3">
                      <Sparkles className="w-5 h-5 text-yellow-500 shrink-0" />
                      <p className="text-xs text-yellow-500/80 leading-relaxed font-medium">
                        Ready for analysis. Our AI will process your document using Gemini Flash AI to provide a deep-dive analysis.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {file && (
                <Button 
                  onClick={handleAnalyze} 
                  disabled={loading}
                  className="w-full h-15 text-black glow-yellow font-bold text-xl rounded-2xl relative group overflow-hidden shadow-xl"
                >
                  <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6 fill-current" />
                        Run AI Analysis
                      </>
                    )}
                  </span>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-8 p-6 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-3xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-tertiary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Why use this?
            </h3>
            <ul className="space-y-3">
              {[
                'ATS compatibility scoring',
                'Keyword gap analysis',
                'Actionable formatting tips',
                'AI powered career coaching'
              ].map((tip, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Results Panel */}
        <div className="flex-1 w-full min-h-[600px] flex flex-col">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card flex-1 p-8 md:p-12 border border-[var(--card-border)] rounded-[2.5rem] relative overflow-hidden shadow-2xl"
              >
                <div className="absolute top-0 right-0 p-8">
                  <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified AI Analysis
                  </div>
                </div>
                
                <div className="max-w-none prose prose-lg dark:prose-invert prose-headings:font-bold prose-h2:text-4xl prose-h2:tracking-tight prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-6 prose-h2:mt-0 prose-h2:mb-10 prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-6 prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed prose-li:text-[var(--text-secondary)] prose-li:my-2 prose-strong:text-white">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {result}
                  </ReactMarkdown>
                  {loading && (
                    <motion.div 
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="inline-block w-4 h-8 ml-2 bg-[var(--accent)] align-middle rounded-sm shadow-[0_0_15px_rgba(251,191,36,0.5)]" 
                    />
                  )}
                </div>

                <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <p className="text-sm text-[var(--text-tertiary)] italic">
                    Analysis generated in real-time. For best results, tailor your resume to specific job descriptions.
                  </p>
                  <Button variant="outline" className="rounded-full px-6 flex items-center gap-2 group" onClick={() => window.print()}>
                    <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Download PDF Report
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 glass-card border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-12 md:p-20 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                
                <div className="relative">
                  <div className="w-28 h-28 rounded-[2rem] bg-white/5 flex items-center justify-center mb-8 text-[var(--accent)] relative">
                    <div className="absolute inset-0 bg-[var(--accent)]/10 blur-2xl rounded-full scale-150 animate-pulse" />
                    <Sparkles className="w-14 h-14 relative z-10" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Ready to Analyze</h3>
                  <p className="text-[var(--text-tertiary)] max-w-md text-lg md:text-xl leading-relaxed mb-12">
                    Upload your professional resume and witness the power of AI-driven career guidance.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
                    {[
                      { icon: ShieldCheck, label: '99% Accuracy', desc: 'Advanced AI processing' },
                      { icon: Clock, label: 'Instant Result', desc: 'No more waiting' },
                      { icon: FileText, label: 'PDF Support', desc: 'Full document parsing' },
                    ].map((item, idx) => (
                      <div key={idx} className="p-6 rounded-3xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                        <item.icon className="w-8 h-8 text-[var(--accent)]/80 mx-auto mb-4" />
                        <div className="text-sm font-bold uppercase tracking-widest text-white/90 mb-1">{item.label}</div>
                        <div className="text-xs text-[var(--text-tertiary)]">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
