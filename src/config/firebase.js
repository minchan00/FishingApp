import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAUWSRRoniotIpXWr05d-ADXc0l_ie0wsI',
  authDomain: 'fishingapp-51ba8.firebaseapp.com',
  projectId: 'fishingapp-51ba8',
  storageBucket: 'fishingapp-51ba8.firebasestorage.app',
  messagingSenderId: '341819121991',
  appId: '1:341819121991:web:226401e71ec635e34f6c62',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
