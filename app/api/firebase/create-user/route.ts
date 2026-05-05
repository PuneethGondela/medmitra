// app/api/firebase/create-user/route.ts
// API route to create users with Firebase Admin SDK (for doctor/admin use)
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";


// Simple in-memory rate limiter for Next.js Serverless Route
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const MAX_REQUESTS = 5; // Max 5 requests per window
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Simple cleanup interval to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((record, ip) => {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  });
}, WINDOW_MS);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  // Extract IP (Next.js serverless proxy headers)
  const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many account creation attempts. Please try again later." },
      { status: 429 }
    );
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Check if user is doctor or admin
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    if (userData?.role !== "doctor" && userData?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Doctor or Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { 
      email, 
      password, 
      name, 
      phone, 
      address, 
      emergencyContact, 
      emergencyPhone,
      aadhaar_number,
      aadhaar_name,
      aadhaar_dob,
      aadhaar_address
    } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, name" },
        { status: 400 }
      );
    }

    // Create auth user using Firebase Admin
    let createdUser;
    try {
      createdUser = await adminAuth.createUser({
        email,
        password,
        emailVerified: true,
      });
    } catch (error: any) {

      // Map specific Firebase errors to safe messages
      let safeMessage = "Failed to create account. Please verify your details and try again.";
      if (error.code === 'auth/email-already-exists') safeMessage = "This email address is already in use.";
      if (error.code === 'auth/invalid-email') safeMessage = "The provided email address is invalid.";
      if (error.code === 'auth/invalid-password') safeMessage = "The password must be at least 6 characters long.";

      return NextResponse.json(
        { error: safeMessage },
        { status: 400 }
      );
    }

    // Create user profile in Firestore
    try {
      await adminDb.collection('users').doc(createdUser.uid).set({
        id: createdUser.uid,
        email,
        name,
        phone: phone || null,
        address: address || null,
        emergency_contact: emergencyContact || null,
        emergency_phone: emergencyPhone || null,
        role: "worker",
        language: "hi-IN",
        aadhaar_number: aadhaar_number || null,
        aadhaar_name: aadhaar_name || null,
        aadhaar_dob: aadhaar_dob || null,
        aadhaar_address: aadhaar_address || null,
        aadhaar_verified: false,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    } catch (error: any) {
      // Rollback: delete auth user if Firestore insert fails
      try {
        await adminAuth.deleteUser(createdUser.uid);
      } catch (rollbackError) {
        console.error("Rollback deleteUser failed:", rollbackError, { uid: createdUser.uid });
      }
      return NextResponse.json(
        { error: "Failed to initialize worker profile. Please try again later." },
        { status: 400 }
      );
    }

    // Log audit (optional)
    try {
      await adminDb.collection('audit_logs').add({
        user_id: userId,
        user_type: userData?.role?.toUpperCase() || 'USER',
        action: "create_worker",
        resource: "user",
        resource_id: createdUser.uid,
        details: {
          email,
          name,
          created_by: userData?.role,
        },
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (auditError) {
      console.error("Audit log error:", auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      success: true,
      worker: {
        id: createdUser.uid,
        email,
        name,
        phone,
      },
    });
  } catch (error: any) {
    console.error("Error creating worker:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during account creation." },
      { status: 500 }
    );
  }
}
