import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native'; // Import Platform to detect Web vs App

const firebaseConfig = {
  apiKey: "AIzaSyBAh9rvzMIhMDdoLCv5GOEZnFjPk_JzE9s",
  authDomain: "qrcode-12b3c.firebaseapp.com",
  projectId: "qrcode-12b3c",
  storageBucket: "qrcode-12b3c.firebasestorage.app",
  messagingSenderId: "349256731828",
  appId: "1:349256731828:web:0c33d2d25715e6cb985be1",
  measurementId: "G-B5RGSJF6D5"
};

const app = initializeApp(firebaseConfig);

// --- PLATFORM AWARE AUTHENTICATION ---
let auth;
if (Platform.OS === 'web') {
  // If running in Safari/Chrome on Mac, use standard Web Auth
  auth = getAuth(app);
} else {
  // If running on Android/iOS, use React Native secure persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

const db = getFirestore(app);

export { auth, db };