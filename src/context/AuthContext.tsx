import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  coverImage?: string;
  role: 'student' | 'alumni' | 'mentor' | 'admin';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  idProofUrl?: string;
  department?: string;
  passOutYear?: string;
  yearOfStudy?: string;
  company?: string;
  position?: string;
  bio?: string;
  skills?: string[];
  github?: string;
  linkedin?: string;
  openToOpportunities?: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<any>;
  signUpWithEmail: (email: string, password: string, name: string, role: string, idProofUrl?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  signInWithGoogle: async () => ({}),
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  resetPassword: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userUnsubscribe: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = doc(db, 'users', currentUser.uid);
        
        // Listen for real-time changes to the user document
        userUnsubscribe = onSnapshot(userDoc, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            if (currentUser.email === 'sauravdhapola04@gmail.com' && data.role !== 'admin') {
              data.role = 'admin';
              await setDoc(userDoc, data, { merge: true });
            }
            setUserData(data);
          } else {
            setUserData(null);
          }
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
        if (userUnsubscribe) {
          userUnsubscribe();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (userUnsubscribe) {
        userUnsubscribe();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  };

  const signUpWithEmail = async (email: string, password: string, name: string, role: string, idProofUrl?: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const currentUser = userCredential.user;
    
    // Update profile with name
    await updateProfile(currentUser, { displayName: name });
    
    // Create user doc
    const newUserData: UserData = {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: name,
      photoURL: null,
      role: role as any,
      verificationStatus: 'verified',
      idProofUrl: idProofUrl || '',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', currentUser.uid), newUserData);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
