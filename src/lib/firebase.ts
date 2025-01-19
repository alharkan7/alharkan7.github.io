import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import type { FirebaseOptions } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

// Log Firebase config (without sensitive values)
// // console.log("Firebase config keys:", Object.keys(import.meta.env).filter(key => key.startsWith('PUBLIC_FIREBASE_')));

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

// Debug: Log the config (excluding sensitive values)
// // console.log('Firebase Config:', {
//   projectId: firebaseConfig.projectId,
//   authDomain: firebaseConfig.authDomain,
//   apiKey: firebaseConfig.apiKey ? '[PRESENT]' : '[MISSING]',
//   appId: firebaseConfig.appId ? '[PRESENT]' : '[MISSING]'
// });

// Check if all required config values are present
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error('Missing required Firebase configuration:', missingKeys);
  throw new Error(`Missing required Firebase configuration: ${missingKeys.join(', ')}`);
}

// console.log('Initializing Firebase app...');

let app: FirebaseApp;
let auth: Auth;

// Initialize Firebase
try {
  // Delete any existing Firebase apps
  getApps().forEach(app => {
    // console.log('Deleting existing Firebase app...');
    deleteApp(app);
  });

  // console.log('Firebase initialization starting...');
  app = initializeApp(firebaseConfig);
  // console.log('Firebase app initialized successfully');
  
  // console.log('Getting auth instance...');
  auth = getAuth(app);
  // console.log('Auth instance obtained successfully');

  // Set persistence to LOCAL
  // console.log('Setting auth persistence...');
  setPersistence(auth, browserLocalPersistence)
    .then(() => console.log('Auth persistence set to LOCAL'))
    .catch(error => console.error('Error setting persistence:', error));
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { auth };