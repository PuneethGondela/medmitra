// app/api/firebase/create-user/route.ts
// API route to create users with Firebase Admin SDK (for doctor/admin use)
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
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
      return NextResponse.json(
        { error: error.message || "Failed to create auth user" },
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
      await adminAuth.deleteUser(createdUser.uid);
      return NextResponse.json(
        { error: error.message || "Failed to create worker profile" },
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
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
