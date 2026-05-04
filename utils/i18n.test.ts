import { expect, it, describe } from "bun:test";
import { t, translations, Locale } from "./i18n";

describe("i18n translation function (t)", () => {
    it("should return the translated string for a valid key without parameters", () => {
        expect(t("en-IN", "app_name")).toBe("Med Mitra");
        expect(t("hi-IN", "app_name")).toBe("मेड मित्र");
    });

    it("should return the key itself if the key does not exist in the translations", () => {
        expect(t("en-IN", "non_existent_key")).toBe("non_existent_key");
        expect(t("te-IN", "another_missing_key")).toBe("another_missing_key");
    });

    it("should correctly replace a single parameter in the translated string", () => {
        expect(t("en-IN", "view_all_visits", { count: 5 })).toBe("View all 5 visits");
        expect(t("hi-IN", "translating_to", { lang: "English" })).toBe("English में अनुवाद हो रहा है...");
    });

    it("should correctly replace multiple occurrences of the same parameter", () => {
        // We will temporarily add a test key to the translations object for this test
        const originalTranslations = { ...translations["en-IN"] };
        translations["en-IN"]["test_multiple_params"] = "Value: {val}, again: {val}";

        expect(t("en-IN", "test_multiple_params", { val: 42 })).toBe("Value: 42, again: 42");

        // Restore
        translations["en-IN"] = originalTranslations;
    });

    it("should correctly replace multiple different parameters", () => {
        const originalTranslations = { ...translations["en-IN"] };
        translations["en-IN"]["test_diff_params"] = "{greeting}, {name}!";

        expect(t("en-IN", "test_diff_params", { greeting: "Hello", name: "Alice" })).toBe("Hello, Alice!");

        // Restore
        translations["en-IN"] = originalTranslations;
    });

    it("should ignore parameters that are passed but not present in the translation string", () => {
        expect(t("en-IN", "app_name", { unused: "param" })).toBe("Med Mitra");
    });

    it("should leave placeholders intact if the corresponding parameter is not provided", () => {
        expect(t("en-IN", "view_all_visits")).toBe("View all {count} visits");
    });
});
