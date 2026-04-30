// app/api/admin/create-doctor/route.ts - MIGRATED TO FIREBASE
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export async function POST(req: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify token using Firebase Admin
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Check if user is admin
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, name, phone, trusted = false } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, name" },
        { status: 400 }
      );
    }

    // Create auth user using Firebase Admin
    let authUser;
    try {
      authUser = await adminAuth.createUser({
        email,
        password,
        emailVerified: true, // Auto-verify email
      });
    } catch (createError: any) {
      return NextResponse.json(
        { error: createError.message || "Failed to create auth user" },
        { status: 400 }
      );
    }

    // Create user profile in Firestore
    try {
      await adminDb.collection("users").doc(authUser.uid).set({
        id: authUser.uid,
        email,
        name,
        phone: phone || null,
        role: "doctor",
        trusted,
        language: "hi-IN",
        created_at: new Date().toISOString(),
      });
    } catch (upsertError: any) {
      // Rollback: delete auth user if Firestore insert fails
      try {
        await adminAuth.deleteUser(authUser.uid);
      } catch (deleteError) {
        console.error("Failed to rollback auth user:", deleteError);
      }
      return NextResponse.json(
        { error: upsertError.message || "Failed to create doctor profile" },
        { status: 400 }
      );
    }

    // Log audit
    await adminDb.collection("audit_logs").add({
      actor_id: decodedToken.uid,
      action: "create_doctor",
      resource_type: "user",
      resource_id: authUser.uid,
      meta: {
        email,
        name,
        trusted,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      doctor: {
        id: authUser.uid,
        email,
        name,
        trusted,
      },
    });
  } catch (error: any) {
    console.error("Error creating doctor:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
