const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} = require("firebase/storage");

const {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
} = require("firebase/firestore");

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCrK6m190Mim7SyaLgnPMskmyyDNyowlzE",
  authDomain: "inventtrack-e9307.firebaseapp.com",
  projectId: "inventtrack-e9307",
  storageBucket: "inventtrack-e9307.firebasestorage.app",
  messagingSenderId: "417146849691",
  appId: "1:417146849691:web:419a33b9bd6ae19361b93e",
  measurementId: "G-4PBJDH9R5W",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore
const storage = getStorage(app);

module.exports = {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  storage,
  deleteDoc,
};
