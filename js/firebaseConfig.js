// js/firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBYluAvQ8mmnlJewbTu_cp3-0NYQJJPL04",
  authDomain: "tasklogger-ffea7.firebaseapp.com",
  projectId: "tasklogger-ffea7",
  storageBucket: "tasklogger-ffea7.appspot.com",
  messagingSenderId: "656885036033",
  appId: "1:656885036033:web:441d661ec4cb29aab37c00",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export db and app for use in other modules
export { db, app };
