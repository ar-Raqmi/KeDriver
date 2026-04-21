import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, collection, getDocs, query, where, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
    } else if (err.code === 'unimplemented') {
        console.warn("The current browser does not support persistence");
    }
});

export async function seedAdmin() {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'ADMIN'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      await addDoc(usersRef, {
        username: 'admin',
        password: 'password123',
        role: 'ADMIN',
        name: 'System Admin',
        createdAt: Date.now()
      });
    }
  } catch (error) {
    console.error("Error seeding admin:", error);
  }
}

export { db };
