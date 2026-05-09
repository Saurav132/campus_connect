import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export const sendNotification = async (
  receiverId: string,
  senderId: string,
  relatedId: string,
  relatedType: 'resource' | 'opportunity' | 'event' | 'connection' | 'chat',
  routePath: string,
  message: string
) => {
  if (receiverId === senderId && senderId !== 'system') return; // Only allow system self-notifs if needed

  try {
    await addDoc(collection(db, 'notifications'), {
      receiverId,
      senderId,
      relatedId,
      relatedType,
      routePath,
      message,
      isRead: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

export const createNotification = async (data: any) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...data,
      senderId: data.senderId || 'system',
      isRead: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const notifyConnections = async (
  senderId: string,
  relatedId: string,
  relatedType: 'resource' | 'opportunity' | 'event' | 'connection' | 'chat',
  routePath: string,
  message: string
) => {
  try {
    const q1 = query(collection(db, 'connections'), where('fromUserId', '==', senderId), where('status', '==', 'accepted'));
    const q2 = query(collection(db, 'connections'), where('toUserId', '==', senderId), where('status', '==', 'accepted'));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const connectionIds = new Set<string>();
    snap1.forEach(doc => connectionIds.add(doc.data().toUserId));
    snap2.forEach(doc => connectionIds.add(doc.data().fromUserId));
    
    const promises = Array.from(connectionIds).map(receiverId => 
      sendNotification(receiverId, senderId, relatedId, relatedType, routePath, message)
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Error notifying connections:', error);
  }
};
