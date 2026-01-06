// app/api/files/signed-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";

// Mark this route as dynamic since it uses request headers
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify Firebase token
    let userId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    const recordId = searchParams.get("recordId");

    if (!path) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    // If recordId is provided, verify authorization
    if (recordId) {
      const recordDoc = await adminDb.collection('records').doc(recordId).get();
      
      if (!recordDoc.exists) {
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      }

      const recordData = recordDoc.data();
      if (!recordData) {
        return NextResponse.json({ error: "Record data not found" }, { status: 404 });
      }

      // Check if user is admin
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : null;

      const isAdmin = userData?.role === "admin";
      const isWorker = recordData.worker_id === userId;
      const isDoctor = recordData.doctor_id === userId;

      if (!isWorker && !isDoctor && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Generate signed URL (15 minutes expiry) using Firebase Storage
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Generate signed URL
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    return NextResponse.json({ signedUrl });
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

