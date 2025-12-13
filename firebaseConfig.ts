
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// --- ISTRUZIONI IMPORTANTI ---
// 1. Vai su https://console.firebase.google.com/
// 2. Crea un progetto e aggiungi una Web App.
// 3. Copia l'oggetto "firebaseConfig" che ti viene fornito.
// 4. Incolla i valori qui sotto al posto delle stringhe segnaposto.

const firebaseConfig = {
  // Sostituisci le stringhe qui sotto con i tuoi dati reali presi da Firebase Console
  apiKey: "AIzaSyD5RkkPoippQ2FfhNBbJ_aRuGI-f7oTMk4",
  authDomain: "calendario-social-ddce2.firebaseapp.com",
  projectId: "calendario-social-ddce2",
  storageBucket: "calendario-social-ddce2.firebasestorage.app",
  messagingSenderId: "427496307382",
  appId: "1:427496307382:web:fc6f960246f48979c38417"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Esportiamo il database per usarlo nel resto dell'app
export const db = getFirestore(app);

// Esportiamo il servizio di autenticazione
export const auth = getAuth(app);

// Configurazione Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
