import { auth } from './firebase';

/**
 * Handles user authentication and session management using client-side Firebase
 * instead of server-side cookies. This allows the site to work in static mode.
 */

// Check if user is authenticated
export const isAuthenticated = () => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(!!user);
    });
  });
};

// Get current user
export const getCurrentUser = () => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// Login with email/password
export const login = async (email, password) => {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    
    // Store auth info in localStorage for static site compatibility
    localStorage.setItem('authUser', JSON.stringify({
      uid: result.user.uid,
      email: result.user.email,
      lastLogin: new Date().toISOString()
    }));
    
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error };
  }
};

// Logout
export const logout = async () => {
  try {
    await auth.signOut();
    localStorage.removeItem('authUser');
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

// Check if session is valid based on localStorage
export const validateSession = () => {
  const authUser = JSON.parse(localStorage.getItem('authUser') || 'null');
  if (!authUser) return false;
  
  // Check if session is not too old (e.g., 5 days)
  const lastLogin = new Date(authUser.lastLogin);
  const now = new Date();
  const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
  
  return now.getTime() - lastLogin.getTime() < fiveDaysInMs;
}; 