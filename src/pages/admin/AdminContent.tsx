import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { collection, query, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '../../components/ui/Card';
import { Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';

export default function AdminContent() {
  const [activeTab, setActiveTab] = useState<'resources' | 'opportunities' | 'events' | 'projects'>('resources');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, activeTab), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, activeTab);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, activeTab, id));
      toast.success(`${activeTab.slice(0, -1)} deleted successfully`);
      setConfirmDelete(null);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${activeTab}/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
         <h1 className="text-3xl font-bold tracking-tight mb-2">Content Moderation</h1>
         <p className="text-[var(--text-secondary)]">Manage and moderate platform wide content.</p>
      </div>

      <div className="flex gap-2 border-b border-[var(--card-border)] pb-2 overflow-x-auto">
        {['resources', 'opportunities', 'events', 'projects'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${
              activeTab === tab 
                ? 'bg-[var(--accent)]/10 text-yellow-500 border-b-2 border-yellow-500' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
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
                    <th className="px-6 py-4 font-medium">Title / Name</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                      <td className="px-6 py-4 max-w-sm truncate font-medium">
                        {item.title || item.name || item.id}
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">
                        {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {confirmDelete === item.id ? (
                          <div className="flex items-center justify-end gap-2">
                             <Button 
                               size="sm" 
                               onClick={() => handleDelete(item.id)}
                               className="bg-red-600 hover:bg-red-700 text-white border-none"
                             >
                               Confirm
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               onClick={() => setConfirmDelete(null)}
                             >
                               Cancel
                             </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setConfirmDelete(item.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                        No {activeTab} found.
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
