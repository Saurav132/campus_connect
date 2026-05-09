import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, doc, deleteDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';

export interface Connection {
  id?: string;
  fromUserId: string;
  toUserId: string;
  status: ConnectionStatus;
  createdAt: any;
  updatedAt: any;
}

export interface AppNotification {
  id?: string;
  userId: string;
  senderId: string;
  type: string; // broadened from literal types
  relatedType?: string;
  message?: string;
  routePath?: string;
  read?: boolean;
  isRead?: boolean;
  isOldFormat?: boolean;
  createdAt: any;
}

export const sendConnectionRequest = async (fromUserId: string, toUserId: string) => {
  if (fromUserId === toUserId) return; // Prevent self-connection

  // Check if connection already exists
  const q1 = query(collection(db, 'connections'), where('fromUserId', '==', fromUserId), where('toUserId', '==', toUserId));
  const q2 = query(collection(db, 'connections'), where('fromUserId', '==', toUserId), where('toUserId', '==', fromUserId));
  
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  if (!snap1.empty || !snap2.empty) {
    throw new Error('Connection request already exists or you are already connected.');
  }

  const connectionRef = await addDoc(collection(db, 'connections'), {
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // Create notification
  await addDoc(collection(db, 'notifications'), {
    userId: toUserId,
    senderId: fromUserId,
    type: 'connection_request',
    read: false,
    createdAt: serverTimestamp()
  });

  return connectionRef.id;
};

export const acceptConnectionRequest = async (connectionId: string, toUserId: string, fromUserId: string) => {
  const connectionRef = doc(db, 'connections', connectionId);
  await updateDoc(connectionRef, {
    status: 'accepted',
    updatedAt: serverTimestamp()
  });

  // Create notification for the person who sent the request
  if (toUserId !== fromUserId) {
    await addDoc(collection(db, 'notifications'), {
      userId: fromUserId,
      senderId: toUserId, // the one accepting is the sender of this notification
      type: 'connection_accepted',
      read: false,
      createdAt: serverTimestamp()
    });
  }
};

export const rejectConnectionRequest = async (connectionId: string) => {
  const connectionRef = doc(db, 'connections', connectionId);
  await updateDoc(connectionRef, {
    status: 'rejected',
    updatedAt: serverTimestamp()
  });
};

export const removeConnection = async (connectionId: string) => {
  const connectionRef = doc(db, 'connections', connectionId);
  await deleteDoc(connectionRef);
};
