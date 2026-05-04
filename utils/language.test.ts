import { expect, it, describe } from "bun:test";
import { getLanguageLabel } from "./language";

describe("getLanguageLabel", () => {
  it("should return 'Hindi' for 'hi-IN'", () => {
    expect(getLanguageLabel("hi-IN")).toBe("Hindi");
  });

  it("should return 'English' for 'en-IN'", () => {
    expect(getLanguageLabel("en-IN")).toBe("English");
  });

  it("should return 'Telugu' for 'te-IN'", () => {
    expect(getLanguageLabel("te-IN")).toBe("Telugu");
  });

  it("should return 'Odia' for 'or-IN'", () => {
    expect(getLanguageLabel("or-IN")).toBe("Odia");
  });

  it("should return 'Unknown' for invalid code", () => {
    expect(getLanguageLabel("fr-FR")).toBe("Unknown");
  });

  it("should return 'Unknown' for empty string", () => {
    expect(getLanguageLabel("")).toBe("Unknown");
  });
});
