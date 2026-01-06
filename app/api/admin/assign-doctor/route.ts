// app/api/admin/assign-doctor/route.ts - MIGRATED TO FIREBASE
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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
    const { worker_id, doctor_id } = body;

    if (!worker_id || !doctor_id) {
      return NextResponse.json(
        { error: "Missing required fields: worker_id, doctor_id" },
        { status: 400 }
      );
    }

    // Verify doctor is trusted
    const doctorDoc = await adminDb.collection("users").doc(doctor_id).get();
    const doctorData = doctorDoc.data();

    if (!doctorData || doctorData.role !== "doctor" || !doctorData.trusted) {
      return NextResponse.json(
        { error: "Doctor must be trusted to be assigned" },
        { status: 400 }
      );
    }

    // Create assignment in Firestore (replacing RPC function)
    const assignmentRef = await adminDb.collection("doctor_assignments").add({
      worker_id,
      doctor_id,
      assigned_by: decodedToken.uid,
      assigned_at: new Date().toISOString(),
      status: "active",
    });

    return NextResponse.json({
      success: true,
      assignment_id: assignmentRef.id,
    });
  } catch (error: any) {
    console.error("Error assigning doctor:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
