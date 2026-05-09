import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent } from '../../components/ui/Card';
import { MoreVertical, ShieldAlert, Trash2, ShieldCheck, Loader2, AlertCircle, Eye, Check, X as CloseIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { motion } from 'motion/react';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewIdProof, setViewIdProof] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleVerify = async (userId: string, newStatus: 'verified' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        verificationStatus: newStatus,
        isVerified: newStatus === 'verified'
      });
      toast.success(newStatus === 'verified' ? "User verified and approved" : "User rejected");
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success("User deleted successfully");
      setConfirmDelete(null);
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.role !== 'admin' && (
      (u.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">User Management</h1>
          <p className="text-[var(--text-secondary)]">Manage accounts, roles, and verification badges.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-[var(--card-border)] bg-[var(--bg-secondary)] flex gap-4 items-center">
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" /></div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Role</th>
                    <th className="px-6 py-4 font-medium">Verification Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`}
                            className="w-10 h-10 rounded-full object-cover" 
                            alt="" 
                          />
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.displayName || 'Unknown'}
                              {user.verificationStatus === 'verified' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                            </div>
                            <div className="text-[var(--text-secondary)] text-xs">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <select 
                           value={user.role || 'student'} 
                           onChange={(e) => handleRoleChange(user.id, e.target.value)}
                           className="bg-transparent border border-[var(--card-border)] rounded px-2 py-1 focus:outline-none focus:border-[var(--accent)] capitalize"
                         >
                           <option value="student">Student</option>
                           <option value="alumni">Alumni</option>
                           <option value="mentor">Mentor</option>
                           <option value="admin">Admin</option>
                         </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            user.verificationStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-500' :
                            user.verificationStatus === 'rejected' ? 'bg-red-500/10 text-red-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {user.verificationStatus || 'Pending'}
                          </span>
                          {user.idProofUrl && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[var(--accent)] hover:bg-[var(--accent)]/10"
                              onClick={() => setViewIdProof(user.idProofUrl)}
                            >
                              <Eye className="w-4 h-4 mr-2" /> View ID
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           {user.verificationStatus !== 'verified' && (
                             <Button 
                               variant="outline" 
                               size="sm" 
                               onClick={() => handleVerify(user.id, 'verified')}
                               className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20"
                             >
                               <Check className="w-4 h-4 mr-1" /> Approve
                             </Button>
                           )}
                           {user.verificationStatus === 'pending' && (
                             <Button 
                               variant="outline" 
                               size="sm" 
                               onClick={() => handleVerify(user.id, 'rejected')}
                               className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
                             >
                               <CloseIcon className="w-4 h-4 mr-1" /> Reject
                             </Button>
                           )}
                           
                           {confirmDelete === user.id ? (
                             <div className="flex items-center gap-2">
                               <Button 
                                 variant="primary" 
                                 size="sm" 
                                 onClick={() => handleDeleteUser(user.id)}
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
                               variant="ghost" 
                               size="sm" 
                               onClick={() => setConfirmDelete(user.id)}
                               className="text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10"
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ID Proof Modal */}
      {viewIdProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl max-w-2xl w-full p-4 relative"
          >
            <button 
              onClick={() => setViewIdProof(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-4">ID Proof Verification</h3>
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
              <img src={viewIdProof} alt="ID Proof" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setViewIdProof(null)}>Close View</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
