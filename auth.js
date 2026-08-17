// public/js/auth.js

// Import Firebase services from your firebase.js
import { auth, db } from "./firebase.js";

// Import Firebase Auth functions
import {
  signInWithEmailAndPassword,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Import Firestore functions
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Admin Login Function
 * - Logs in admin
 * - Checks admin Firestore document
 * - Checks role, enabled, canLogin
 * - Updates lastLogin timestamp
 */
export async function adminLogin(email, password) {
  // Sign in admin
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  const user = userCred.user;

  // Optional: Require email verification
  if (!user.emailVerified) {
    await sendEmailVerification(user);
    throw new Error("Email not verified. Verification email sent.");
  }

  // Refresh token
  await user.getIdToken(true);

  // Small delay to ensure Firestore reads correctly
  await new Promise(r => setTimeout(r, 350));

  // Get admin document
  const uid = user.uid;
  const adminRef = doc(db, "admins", uid);
  const adminSnap = await getDoc(adminRef);

  if (!adminSnap.exists()) {
    throw new Error("You are not an admin.");
  }

  const adminData = adminSnap.data();

  // Admin permission checks
  if (adminData.enabled !== true) {
    throw new Error("Admin account disabled.");
  }

  if (adminData.canLogin !== true) {
    throw new Error("Admin login blocked.");
  }

  if (adminData.role !== "admin") {
    throw new Error("Admin role required.");
  }

  // Update last login timestamp
  await updateDoc(adminRef, {
    lastLogin: serverTimestamp()
  });

  return adminData;
}
