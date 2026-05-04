import { expect, it, describe } from "bun:test";
import { cn } from "./utils";

describe("cn", () => {
    it("should merge simple string classes", () => {
        expect(cn("class1", "class2")).toBe("class1 class2");
    });

    it("should handle array classes", () => {
        expect(cn(["class1", "class2"])).toBe("class1 class2");
    });

    it("should handle conditional object classes", () => {
        expect(cn({ "class1": true, "class2": false, "class3": true })).toBe("class1 class3");
    });

    it("should merge and resolve tailwind conflicts", () => {
        // twMerge logic: later classes override earlier ones for the same property
        expect(cn("px-2 py-1", "p-4")).toBe("p-4");
        expect(cn("text-sm", "text-lg")).toBe("text-lg");
        expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
    });

    it("should handle falsy values", () => {
        expect(cn("class1", null, undefined, false, 0, "", "class2")).toBe("class1 class2");
    });

    it("should handle complex combined inputs", () => {
        const isActive = true;
        const hasError = false;

        const result = cn(
            "base-class",
            isActive && "active-class",
            hasError ? "text-red-500" : "text-green-500",
            { "extra-class": true, "ignored": false },
            "p-2",
            "p-4" // should override p-2
        );

        expect(result).toBe("base-class active-class text-green-500 extra-class p-4");
    });
});
