
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
let app;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  enableIndexedDbPersistence(db).catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
      } else if (err.code == 'unimplemented') {
          console.warn("The current browser does not support all of the features required to enable persistence");
      }
  });

  console.log("✅ Firebase Connected Successfully with Persistence");
} catch (error) {
  console.error("❌ Error initializing Firebase:", error);
}

export { db };
