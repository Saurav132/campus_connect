import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '../../components/ui/Card';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      toast.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: newStatus
      });
      toast.success(`Report marked as ${newStatus}`);
      fetchReports();
    } catch (error) {
      toast.error("Failed to update report");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Content Reports</h1>
        <p className="text-[var(--text-secondary)]">Review flagged content and user reports.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium max-w-xs truncate">Reason</th>
                    <th className="px-6 py-4 font-medium">Target ID</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                      <td className="px-6 py-4 capitalize font-semibold flex items-center gap-2">
                        {report.status === 'pending' ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        )}
                        {report.targetType}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate" title={report.reason}>
                         {report.reason}
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)] font-mono text-xs">
                        {report.targetId}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          report.status === 'pending' ? 'bg-red-500/10 text-red-500' :
                          report.status === 'reviewed' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           {report.status === 'pending' && (
                             <Button size="sm" onClick={() => handleStatusChange(report.id, 'reviewed')}>
                               Mark Reviewed
                             </Button>
                           )}
                           {report.status === 'reviewed' && (
                             <Button size="sm" variant="outline" className="text-emerald-500" onClick={() => handleStatusChange(report.id, 'resolved')}>
                               Resolve
                             </Button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                        No reports found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
