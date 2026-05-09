import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { collection, getCountFromServer, query, where, getDocs, limit, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Users, FileText, Briefcase, Flag, Loader2, ArrowUpRight, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    users: 0,
    resources: 0,
    opportunities: 0,
    reports: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [showAllReports, setShowAllReports] = useState(false);

  const resolveReport = async (reportId: string, action: 'resolved' | 'dismissed') => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: action,
        resolvedAt: new Date().toISOString()
      });
      toast.success(`Report ${action}`);
      // Refresh reports
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(showAllReports ? 50 : 5));
      const reportsSnapshot = await getDocs(q);
      setRecentReports(reportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  useEffect(() => {
    async function loadStats() {
      try {
        const [usersSnap, resSnap, oppSnap, repSnap] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'resources')),
          getCountFromServer(collection(db, 'opportunities')),
          getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'pending')))
        ]);

        setStats({
          users: usersSnap.data().count,
          resources: resSnap.data().count,
          opportunities: oppSnap.data().count,
          reports: repSnap.data().count
        });

        const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(5));
        const reportsSnapshot = await getDocs(q);
        setRecentReports(reportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'admin_stats');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>;

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Resources', value: stats.resources, icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Opportunities', value: stats.opportunities, icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Pending Reports', value: stats.reports, icon: Flag, color: 'text-red-500', bg: 'bg-red-500/10' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Overview</h1>
        <p className="text-[var(--text-secondary)]">Monitor Campus Connect AI metrics and vitals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className={showAllReports ? "lg:col-span-2" : ""}>
          <CardHeader className="flex flex-row items-center justify-between">
             <div>
               <CardTitle>{showAllReports ? 'All Reports' : 'Recent Reports'}</CardTitle>
               <CardDescription>Latest flagged content requiring moderation.</CardDescription>
             </div>
             <Button variant="ghost" size="sm" onClick={() => setShowAllReports(!showAllReports)}>
               {showAllReports ? 'Show Recent' : 'View All'}
             </Button>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                {recentReports.length > 0 ? recentReports.map((report) => (
                  <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] gap-4">
                     <div>
                       <p className="text-sm font-semibold capitalize">{report.targetType} reported</p>
                       <p className="text-xs text-red-500 mb-1">Reason: {report.reason}</p>
                       <p className="text-[10px] text-[var(--text-tertiary)]">ID: {report.targetId}</p>
                     </div>
                     <div className="flex items-center gap-2">
                        {report.status === 'pending' ? (
                          <>
                            <Button size="sm" variant="primary" className="h-7 text-[10px]" onClick={() => resolveReport(report.id, 'resolved')}>
                              Mark Resolved
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => resolveReport(report.id, 'dismissed')}>
                              Dismiss
                            </Button>
                          </>
                        ) : (
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                            report.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'
                          }`}>
                            {report.status}
                          </span>
                        )}
                     </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-[var(--text-secondary)] flex flex-col items-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mb-2 opacity-50" />
                    <p>No reports found.</p>
                  </div>
                )}
             </div>
          </CardContent>
        </Card>

         <Card>
          <CardHeader>
             <CardTitle>Quick Actions</CardTitle>
             <CardDescription>Manage platform health directly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             <button className="w-full flex items-center justify-between p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] hover:bg-[var(--bg-tertiary)] transition-colors text-left group">
               <div>
                  <p className="font-semibold text-sm">Send Global Announcement</p>
                  <p className="text-xs text-[var(--text-secondary)]">Broadcast message to all active users</p>
               </div>
               <ArrowUpRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
             </button>
             <button 
               onClick={() => navigate('/admin/events')}
               className="w-full flex items-center justify-between p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] hover:bg-[var(--bg-tertiary)] transition-colors text-left group"
             >
               <div>
                  <p className="font-semibold text-sm">Review Pending Events</p>
                  <p className="text-xs text-[var(--text-secondary)]">Moderate recent event hosting requests</p>
               </div>
               <ArrowUpRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
             </button>
             <button className="w-full flex items-center justify-between p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] hover:bg-[var(--bg-tertiary)] transition-colors text-left group">
               <div>
                  <p className="font-semibold text-sm">Review Pending Users</p>
                  <p className="text-xs text-[var(--text-secondary)]">Verify alumni and mentor requests</p>
               </div>
               <ArrowUpRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
             </button>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
