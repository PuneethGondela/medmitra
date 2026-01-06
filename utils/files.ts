// utils/files.ts
// Helper to get signed URLs for secure file access

export async function getSignedUrl(path: string, recordId?: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ path });
    if (recordId) {
      params.append("recordId", recordId);
    }

    const response = await fetch(`/api/files/signed-url?${params.toString()}`);
    
    if (!response.ok) {
      console.error("Failed to get signed URL:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.signedUrl || null;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    return null;
  }
}

// Extract path from full URL or use path directly
export function extractStoragePath(url: string): string | null {
  try {
    // If it's already a path (no http), return as is
    if (!url.startsWith("http")) {
      return url;
    }

    // Extract path from Supabase storage URL
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/health-files\/(.+)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Try to extract from other formats
    const segments = urlObj.pathname.split("/");
    const healthFilesIndex = segments.indexOf("health-files");
    if (healthFilesIndex !== -1 && segments[healthFilesIndex + 1]) {
      return segments.slice(healthFilesIndex + 1).join("/");
    }

    return null;
  } catch {
    return null;
  }
}

