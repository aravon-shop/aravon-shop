```javascript
// ============================================================
// ARAVON SHOP
// ADMIN LOGIN
// File:
// /admin/shared/admin-login.js
// ============================================================

import {
  adminLogin,
  auth,
  isAuthorizedAdmin
} from "./auth.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// ============================================================
// ELEMENTS
// ============================================================

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const errorBox =
  document.getElementById("error");

const loginBtn =
  document.getElementById("loginBtn");


// ============================================================
// DASHBOARD
// ============================================================
//
// admin-login.html is:
//
// /admin/admin-login.html
//
// Dashboard is:
//
// /admin/Dashboard/admin-dashboard.html
//
// ============================================================

const DASHBOARD_URL =
  "/admin/Dashboard/admin-dashboard.html";


// ============================================================
// SHOW ERROR
// ============================================================

function showError(message) {

  if (!errorBox) {
    return;
  }

  errorBox.textContent =
    message || "";

}


// ============================================================
// CLEAR ERROR
// ============================================================

function clearError() {

  if (!errorBox) {
    return;
  }

  errorBox.textContent =
    "";

}


// ============================================================
// LOGIN
// ============================================================

async function handleLogin() {

  if (
    !emailInput ||
    !passwordInput ||
    !loginBtn
  ) {

    console.error(
      "Admin login elements are missing."
    );

    return;
  }


  const email =
    emailInput.value.trim();

  const password =
    passwordInput.value;


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (!email) {

    showError(
      "Please enter the admin email."
    );

    emailInput.focus();

    return;
  }


  if (!password) {

    showError(
      "Please enter the admin password."
    );

    passwordInput.focus();

    return;
  }


  clearError();


  // ----------------------------------------------------------
  // DISABLE BUTTON
  // ----------------------------------------------------------

  loginBtn.disabled =
    true;

  loginBtn.textContent =
    "Logging in...";


  try {

    // --------------------------------------------------------
    // FIREBASE ADMIN LOGIN
    // --------------------------------------------------------

    const adminData =
      await adminLogin(
        email,
        password
      );


    // --------------------------------------------------------
    // EXTRA AUTHORIZATION CHECK
    // --------------------------------------------------------

    if (
      !adminData ||
      !adminData.user ||
      !isAuthorizedAdmin(
        adminData.user
      )
    ) {

      throw new Error(
        "This account is not authorized to access the admin panel."
      );

    }


    console.log(
      "Admin login successful:",
      adminData.email
    );


    clearError();


    // --------------------------------------------------------
    // GO TO DASHBOARD
    // --------------------------------------------------------

    window.location.replace(
      DASHBOARD_URL
    );


  } catch (error) {

    console.error(
      "Admin login failed:",
      error
    );


    showError(
      error.message ||
      "Unable to log in."
    );


    // --------------------------------------------------------
    // ENABLE LOGIN AGAIN
    // --------------------------------------------------------

    loginBtn.disabled =
      false;

    loginBtn.textContent =
      "Login";

  }

}


// ============================================================
// BUTTON CLICK
// ============================================================

if (loginBtn) {

  loginBtn.addEventListener(
    "click",
    handleLogin
  );

}


// ============================================================
// ENTER KEY
// ============================================================
//
// Only trigger when the user is inside the login form fields.
// This prevents accidental duplicate login attempts.
//
// ============================================================

if (emailInput) {

  emailInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        handleLogin();

      }

    }
  );

}


if (passwordInput) {

  passwordInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        handleLogin();

      }

    }
  );

}


// ============================================================
// CHECK EXISTING FIREBASE SESSION
// ============================================================
//
// Firebase LOCAL persistence means that after the admin
// successfully logs in, the session survives navigation.
//
// If the admin later opens:
//
// /admin/admin-login.html
//
// while already authenticated, they are automatically sent
// back to the dashboard.
//
// ============================================================

let sessionChecked =
  false;


onAuthStateChanged(
  auth,
  user => {

    if (sessionChecked) {
      return;
    }


    sessionChecked =
      true;


    if (!user) {
      return;
    }


    // --------------------------------------------------------
    // VALID ADMIN SESSION
    // --------------------------------------------------------

    if (
      isAuthorizedAdmin(
        user
      )
    ) {

      console.log(
        "Existing admin session detected."
      );


      window.location.replace(
        DASHBOARD_URL
      );


      return;
    }


    // --------------------------------------------------------
    // WRONG FIREBASE ACCOUNT
    // --------------------------------------------------------

    console.warn(
      "A Firebase account is signed in, but it is not the authorized admin."
    );

  }
);
```
