import { create } from 'zustand';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const useAuthStore = create((set) => ({
  user: null,
  isAdmin: false,
  loading: true,

  initAuth: () => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if user is admin. The user mentioned "db/admins" -> "collection of userid".
          // This could mean collection 'db', doc 'admins', containing field or subcollection.
          // Or collection 'admins' with docId = userId. Let's check collection 'admins' first.
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          let isAdmin = adminDoc.exists();

          // Fallback check if it's db/admins doc with array
          if (!isAdmin) {
            const dbAdmins = await getDoc(doc(db, 'db', 'admins'));
            if (dbAdmins.exists()) {
              const data = dbAdmins.data();
              if (data.userIds && Array.isArray(data.userIds)) {
                isAdmin = data.userIds.includes(user.uid);
              }
            }
          }

          set({ user, isAdmin, loading: false });
        } catch (error) {
          console.error("Error checking admin status:", error);
          set({ user, isAdmin: false, loading: false });
        }
      } else {
        set({ user: null, isAdmin: false, loading: false });
      }
    });
  },

  login: async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  },

  logout: async () => {
    await signOut(auth);
  }
}));
