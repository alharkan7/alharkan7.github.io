/// <reference types="astro/client-image" />
import type { APIContext, APIRoute } from 'astro';
import { initializeApp, cert, getApps, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

interface ImportMetaEnvExtended {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  [key: string]: string | undefined;
}

declare global {
  interface ImportMetaEnv extends ImportMetaEnvExtended {}
}

// Initialize Firebase Admin if it hasn't been initialized
if (getApps().length > 0) {
  // console.log("Deleting existing Firebase Admin apps...");
  getApps().forEach(app => deleteApp(app));
}

// console.log("Initializing Firebase Admin...");
try {
  // Check if all required environment variables are present
  const requiredEnvVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'] as const;
  // console.log("Checking required environment variables...");
  // console.log("Available environment variables:", Object.keys(import.meta.env).filter(key => key.startsWith('FIREBASE_')));
  
  const missingVars = requiredEnvVars.filter(varName => {
    const exists = !!import.meta.env[varName];
    // console.log(`${varName}: ${exists ? 'present' : 'missing'}`);
    return !exists;
  });
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // console.log("All required environment variables are present");
  // console.log("Initializing Firebase Admin with project ID:", import.meta.env.FIREBASE_PROJECT_ID);

  const privateKey = import.meta.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY is empty or malformed');
  }

  initializeApp({
    credential: cert({
      projectId: import.meta.env.FIREBASE_PROJECT_ID,
      clientEmail: import.meta.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
  // console.log("Firebase Admin initialized successfully");
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
  throw error;
}

const adminAuth = getAuth();

export const POST: APIRoute = async ({ request }) => {
  try {
    // console.log("Received auth request");
    const body = await request.json();
    // console.log("Request body received:", { ...body, token: '[REDACTED]' });

    if (!body.token) {
      console.error("No token provided");
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // Verify the token
      // console.log("Verifying token...");
      const decodedToken = await adminAuth.verifyIdToken(body.token);
      // console.log("Token verified for user:", decodedToken.uid);

      // Create session cookie
      const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
      const sessionCookie = await adminAuth.createSessionCookie(body.token, { expiresIn });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `session=${sessionCookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${expiresIn}`
        }
      });
    } catch (error) {
      console.error("Token verification failed:", error);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ cookies }) => {
  // console.log("Received session verification request");
  try {
    const sessionCookie = cookies.get("session")?.value;
    // console.log("Session cookie present:", !!sessionCookie);
    
    if (!sessionCookie) {
      // console.log("No session cookie found");
      return new Response(JSON.stringify({ valid: false, error: "No session cookie" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify the session cookie
    try {
      // console.log("Verifying session cookie...");
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
      // console.log("Session cookie verified for user:", decodedClaims.uid);
      
      return new Response(JSON.stringify({ 
        valid: true, 
        uid: decodedClaims.uid,
        email: decodedClaims.email 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (verifyError) {
      console.error("Session verification failed:", verifyError);
      // Only clear the cookie if it's invalid
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.append('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
      
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Invalid session",
        details: verifyError instanceof Error ? verifyError.message : String(verifyError)
      }), {
        status: 401,
        headers
      });
    }
  } catch (error) {
    console.error("Session check error:", error);
    return new Response(JSON.stringify({ 
      valid: false, 
      error: "Session check failed",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ cookies }) => {
  // console.log("Received logout request");
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.append('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers
  });
};