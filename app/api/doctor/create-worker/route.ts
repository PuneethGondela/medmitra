import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    let userRole: string | null = null;
    let userEmail: string | undefined = undefined;

    // Debug Logging Setup
    const fs = require('fs');
    const log = (msg: string) => {
      try {
        fs.appendFileSync('debug-api-route.log', `[${new Date().toISOString()}] ${msg}\n`);
      } catch (e) { }
    };

    log(`POST /api/doctor/create-worker started`);

    try {
      // Check if initialized
      if (!adminAuth || !adminDb) {
        throw new Error("Firebase Admin not initialized");
      }

      // Get auth token from request
      const authHeader = req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
      }

      const token = authHeader.replace("Bearer ", "");

      // Verify Firebase token
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
      userEmail = decodedToken.email;
      const tokenRole = decodedToken.role; // Custom claim from createCustomToken

      log(`[Auth] Token Verified. UID: ${userId}, Email: ${userEmail}, TokenRole: ${tokenRole}`);

      // 1. Check 'users' collection (Standard Users)
      // Only do this if it looks like a standard Firebase UID (28 chars usually) or NOT a custom ID
      if (!userId.startsWith('DOC_') && !userId.startsWith('ADM_')) {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (userDoc.exists) {
          userRole = userDoc.data()?.role;
          log(`[Auth] Found in 'users' collection. Role: ${userRole}`);
        }
      }

      // 2. Check 'doctors' collection (Doctors with DOC_ IDs)
      if ((!userRole || userRole !== 'doctor')) {
        if (userId.startsWith('DOC_')) {
          // Direct lookup by ID
          const doctorDoc = await adminDb.collection('doctors').doc(userId).get();
          if (doctorDoc.exists) {
            userRole = 'doctor';
            log(`[Auth] Found in 'doctors' collection by ID. Role set to doctor.`);
          }
        } else if (userEmail) {
          // Fallback: Lookup by email
          log(`[Auth] Checking 'doctors' collection for email: ${userEmail}`);
          const doctorQuery = await adminDb.collection('doctors').where('email', '==', userEmail).limit(1).get();
          if (!doctorQuery.empty) {
            userRole = 'doctor';
            log(`[Auth] Found in 'doctors' collection by Email. Role set to doctor.`);
          }
        }
      }

      // 3. Check 'admins' collection
      if ((!userRole || (userRole !== 'doctor' && userRole !== 'admin'))) {
        if (userId.startsWith('ADM_')) {
          // Direct lookup by ID (assuming ADM_ prefix)
          userRole = 'admin'; // Assume valid if signed token has ADM_ ID (simplified)
          const adminDoc = await adminDb.collection('admins').doc(userId).get(); // Verify existence
          if (!adminDoc.exists) userRole = null;
          else log(`[Auth] Found in 'admins' collection by ID.`);
        } else if (userEmail) {
          log(`[Auth] Checking 'admins' collection for email: ${userEmail}`);
          const adminQuery = await adminDb.collection('admins').where('email', '==', userEmail).limit(1).get();
          if (!adminQuery.empty) {
            userRole = 'admin';
            log(`[Auth] Found in 'admins' collection by Email.`);
          }
        }
      }

      // 4. Fallback: Trust Token Claim (if present and verified)
      // This is safe because verifyIdToken ensures integrity.
      if (!userRole && tokenRole === 'doctor') {
        userRole = 'doctor';
        log(`[Auth] Role derived from Token Claim.`);
      }

      log(`[Auth Verify] Final Resolution - User: ${userEmail || userId}, Role: ${userRole}`);

    } catch (firebaseError: any) {
      console.error("Firebase Verify Error:", firebaseError);
      log(`[Auth Error] ${firebaseError.message}\n${firebaseError.stack}`);
      return NextResponse.json({ error: `Auth Error: ${firebaseError.message}` }, { status: 401 });
    }

    if (!userId || (userRole !== "doctor" && userRole !== "admin")) {
      log(`[Auth Denied] Forbidden access.`);
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
      aadhaar_address,
      age,
      bloodGroup,
      gender,
      language,
      consentObtained
    } = body;

    log(`[Create Worker] Request for: ${email}, Name: ${name}`);

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
      log(`[Create Worker] Auth user created: ${createdUser.uid}`);
    } catch (error: any) {
      log(`[Create Worker] Auth creation failed: ${error.message}`);
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
        language: language || "hi-IN",
        aadhaar_number: aadhaar_number || null,
        aadhaar_name: aadhaar_name || null,
        aadhaar_dob: aadhaar_dob || null,
        aadhaar_address: aadhaar_address || null,
        aadhaar_verified: false,
        age: age ? parseInt(age) : null,
        blood_group: bloodGroup || null,
        gender: gender || null,
        consent_verified: consentObtained || false,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
      log(`[Create Worker] Firestore profile created.`);
    } catch (error: any) {
      log(`[Create Worker] Firestore profile failed: ${error.message}`);
      // Rollback
      await adminAuth.deleteUser(createdUser.uid);
      return NextResponse.json(
        { error: error.message || "Failed to create worker profile" },
        { status: 400 }
      );
    }

    // Log audit
    try {
      await adminDb.collection('audit_logs').add({
        user_id: userId,
        user_type: userRole?.toUpperCase() || 'USER',
        action: "create_worker",
        resource: "user",
        resource_id: createdUser.uid,
        details: {
          email,
          name,
          created_by: userRole,
        },
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (auditError) {
      // ignore
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
