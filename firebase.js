// ============================================================
// public/js/firebase.js
// SHARED FIREBASE CONFIGURATION
//
// Central Firebase module for the entire Aravon Shop.
//
// Used by:
//   - Admin pages
//   - Customer pages
//   - Product services
//   - Inventory
//   - Orders
//   - Messages
//   - Notifications
//   - Authentication
//   - Firebase Storage
//
// IMPORTANT:
// Do NOT initialize Firebase again inside individual HTML files.
// Import Firebase services from this file instead.
// ============================================================


// ============================================================
// FIREBASE CORE
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


// ============================================================
// FIREBASE AUTH
// ============================================================

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// ============================================================
// FIREBASE FIRESTORE
// ============================================================

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ============================================================
// FIREBASE STORAGE
// ============================================================

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


// ============================================================
// FIREBASE CONFIGURATION
// ============================================================

const firebaseConfig = {

  apiKey:
    "AIzaSyAs2n_FyLyH7GmVmJ_GcyYF9UaAQxg9QnY",

  authDomain:
    "aravon-shop-48fdd.firebaseapp.com",

  projectId:
    "aravon-shop-48fdd",

  storageBucket:
    "aravon-shop-48fdd.firebasestorage.app",

  messagingSenderId:
    "436832537701",

  appId:
    "1:436832537701:web:0047524bb50e9942390a8c"

};


// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);


// ============================================================
// FIREBASE SERVICES
// ============================================================

export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app);


// ============================================================
// FIRESTORE EXPORTS
// ============================================================

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction
};


// ============================================================
// AUTH EXPORTS
// ============================================================

export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
};


// ============================================================
// STORAGE EXPORTS
// ============================================================

export {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};