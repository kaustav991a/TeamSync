// js/auth.js

let currentUser = null; // Will hold the current user object
let isAdmin = false; // Will hold the admin status
let authStateCallback = null; // To store the callback for onAuthStateChanged

// Internal function to notify subscribers of auth state change
const _notifyAuthStateChange = () => {
  if (authStateCallback) {
    authStateCallback(currentUser);
  }
};

// Initialize authentication state from session storage
const initAuth = async () => {
  try {
    const storedUser = sessionStorage.getItem("currentUser");
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
      if (currentUser && currentUser.name && currentUser.role) {
        isAdmin = currentUser.role === "admin";
        // console.log("isAdmin status from sessionStorage:", isAdmin);
      } else {
        console.warn(
          "Stored user in session storage is missing a 'name' or 'role' property or is invalid. Clearing session."
        );
        sessionStorage.removeItem("currentUser");
        currentUser = null;
        isAdmin = false;
      }
    }
  } catch (e) {
    console.error("Error parsing stored user from sessionStorage:", e);
    sessionStorage.removeItem("currentUser");
    currentUser = null;
    isAdmin = false;
  }
  // initAuth only sets the state, doesn't notify immediately upon load.
  // Notification happens via onAuthStateChanged or explicit calls after state changes.
};

// Custom onAuthStateChanged to notify when auth state changes
const onAuthStateChanged = (callback) => {
  authStateCallback = callback;
  // Immediately call the callback with the current user state.
  // This function is expected to be called by main.js *after* DOMContentLoaded,
  // so currentUser will already be initialized by initAuth() and DOM elements will be ready.
  callback(currentUser);
};

// Function to handle user login.
const signIn = async (username, password) => {
  // In a real app, you'd validate credentials against a backend/Firebase Auth.
  // For this example, we'll assume a successful login for any input
  // and assign a role based on username for demonstration.
  // Replace with your actual authentication logic.

  // Simple dummy authentication for demonstration:
  let role = "user";
  if (username === "admin" && password === "adminpass") {
    // Example admin credentials
    role = "admin";
  } else if (username === "user" && password === "userpass") {
    // Example user credentials
    role = "user";
  } else {
    alert("Invalid username or password.");
    currentUser = null;
    isAdmin = false;
    _notifyAuthStateChange(); // Notify even on failed login to clear UI if needed
    return;
  }

  currentUser = { name: username, role: role };
  sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
  isAdmin = currentUser.role === "admin";
  console.log("isAdmin status after login:", isAdmin);

  _notifyAuthStateChange(); // Notify subscribers after successful login
};

// Function to handle user logout
const signOut = () => {
  currentUser = null;
  isAdmin = false;
  sessionStorage.removeItem("currentUser");
  _notifyAuthStateChange(); // Notify subscribers of logout
};

// Call initAuth once when the module is loaded to set initial state.
// This ensures currentUser and isAdmin are populated from session storage
// before onAuthStateChanged is potentially called from main.js.
initAuth();

// Export variables and functions needed elsewhere
export { currentUser, isAdmin, onAuthStateChanged, signIn, signOut };
