import { expect, it, describe } from "bun:test";
import { extractStoragePath } from "./files";

describe("extractStoragePath", () => {
  it("should return the input as-is if it does not start with 'http'", () => {
    expect(extractStoragePath("path/to/file.png")).toBe("path/to/file.png");
    expect(extractStoragePath("/absolute/path.txt")).toBe("/absolute/path.txt");
    expect(extractStoragePath("health-files/doc.pdf")).toBe("health-files/doc.pdf");
  });

  it("should extract the path from a Supabase storage URL", () => {
    const url = "https://xyz.supabase.co/storage/v1/object/public/health-files/user123/prescription.pdf";
    expect(extractStoragePath(url)).toBe("user123/prescription.pdf");
  });

  it("should extract the path from other URLs containing 'health-files' segment", () => {
    const url1 = "https://example.com/api/files/health-files/documents/scan.jpg";
    expect(extractStoragePath(url1)).toBe("documents/scan.jpg");

    const url2 = "http://localhost:3000/public/health-files/images/xray.png";
    expect(extractStoragePath(url2)).toBe("images/xray.png");
  });

  it("should return null if 'health-files' segment exists but has no following path", () => {
    const url = "https://example.com/health-files";
    expect(extractStoragePath(url)).toBeNull();

    const urlTrailing = "https://example.com/health-files/";
    expect(extractStoragePath(urlTrailing)).toBeNull();
  });

  it("should return null for HTTP URLs that do not match expected patterns", () => {
    const url = "https://example.com/other-folder/document.pdf";
    expect(extractStoragePath(url)).toBeNull();
  });

  it("should return null for invalid HTTP URLs that cause URL parsing to fail", () => {
    expect(extractStoragePath("http:// invalid url")).toBeNull();
  });
});
