import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  ConfirmationResult,
  Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAw1Z4iSgfFy_Xw0Eh--V4Gyj14BY_SakA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-1427447382-cd5d2.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-1427447382-cd5d2",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-1427447382-cd5d2.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "359029398944",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:359029398944:web:d8b980c68511ce175918c5",
};

// Intercept identitytoolkit project query in browser to safeguard Firebase Auth origin validation
// against "TypeError: t is not iterable" when authorizedDomains is not returned by Google API.
if (typeof window !== "undefined" && typeof window.fetch === "function") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const url = args[0]?.toString() || "";
    if (url.includes("identitytoolkit.googleapis.com/v1/projects")) {
      try {
        const response = await originalFetch(...args);
        const clone = response.clone();
        const data = await clone.json();
        if (!data.authorizedDomains || !Array.isArray(data.authorizedDomains) || data.authorizedDomains.length === 0) {
          const currentHost = window.location.hostname;
          data.authorizedDomains = [
            currentHost,
            "localhost",
            "127.0.0.1",
            "gadariya.org",
            "www.gadariya.org",
            "gadariya-livid.vercel.app",
            "studio-1427447382-cd5d2.firebaseapp.com",
            "studio-1427447382-cd5d2.web.app",
          ];
          return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
        return response;
      } catch {
        return originalFetch(...args);
      }
    }
    return originalFetch(...args);
  };
}

// Initialize Firebase only in browser or once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("profile");
googleProvider.addScope("email");
googleProvider.setCustomParameters({ prompt: "select_account" });

export {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  type ConfirmationResult,
};
