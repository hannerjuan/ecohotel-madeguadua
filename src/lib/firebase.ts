import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  ...firebaseConfigData,
  // Ensure we use the firestoreDatabaseId if provided
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfigData.firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firebase Cloud Messaging
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Request push notification permission and get token
export const requestNotificationPermission = async () => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Note: In a production app, you need to pass a vapidKey to getToken
      // const token = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
      const token = await getToken(messaging);
      console.log('Notification permission granted. Token:', token);
      return token;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

// Set up real-time listener for new reservations to alert admins
export const setupAdminReservationNotifications = () => {
  const q = query(collection(db, 'reservations'));
  let isInitialLoad = true;

  return onSnapshot(q, (snapshot) => {
    if (isInitialLoad) {
      isInitialLoad = false;
      return; // Skip the initial snapshot which contains all existing reservations
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const reservation = change.doc.data();
        
        // Check if we have permission to show notifications
        if (Notification.permission === 'granted') {
          const notification = new Notification('¡Nueva Reserva Recibida!', {
            body: `${reservation.guestName} ha reservado la cabaña ${reservation.cabinName} del ${reservation.checkIn} al ${reservation.checkOut}.`,
            icon: '/favicon.ico' // Assuming there's a favicon
          });

          notification.onclick = () => {
            window.focus();
            // Optionally navigate to admin dashboard
          };
        }
      }
    });
  });
};

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
