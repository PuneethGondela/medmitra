import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { speakHealthRecord } from "./voice";

describe("speakHealthRecord", () => {
  let originalWindow: any;

  beforeEach(() => {
    // Save original window if it exists (though usually undefined in Bun)
    originalWindow = global.window;
  });

  afterEach(() => {
    // Restore original window
    if (originalWindow === undefined) {
      // @ts-ignore
      delete global.window;
    } else {
      global.window = originalWindow;
    }
    // @ts-ignore
    delete global.SpeechSynthesisUtterance;
  });

  it("should return false if window is undefined", () => {
    // @ts-ignore
    delete global.window;
    expect(speakHealthRecord("test", "en-US")).toBe(false);
  });

  it("should return false if speechSynthesis is not in window", () => {
    // @ts-ignore
    global.window = {};
    expect(speakHealthRecord("test", "en-US")).toBe(false);
  });

  it("should speak the text and return true on success", () => {
    const mockCancel = mock(() => {});
    const mockSpeak = mock((utterance) => {});

    // @ts-ignore
    global.window = {
      speechSynthesis: {
        cancel: mockCancel,
        speak: mockSpeak,
      }
    };

    const mockUtteranceConstructor = mock((text: string) => {
      return {
        text,
        lang: "",
        rate: 1,
        pitch: 1
      };
    });

    // @ts-ignore
    global.SpeechSynthesisUtterance = mockUtteranceConstructor;

    const result = speakHealthRecord("Hello", "en-US");

    expect(result).toBe(true);
    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();
    expect(mockUtteranceConstructor).toHaveBeenCalledWith("Hello");

    // Let's verify the utterance properties
    const utteranceArg = mockSpeak.mock.calls[0][0];
    expect(utteranceArg.text).toBe("Hello");
    expect(utteranceArg.lang).toBe("en-US");
    expect(utteranceArg.rate).toBe(0.9);
    expect(utteranceArg.pitch).toBe(1.0);
  });

  it("should fallback to empty string if text is falsy", () => {
    const mockCancel = mock(() => {});
    const mockSpeak = mock((utterance) => {});

    // @ts-ignore
    global.window = {
      speechSynthesis: {
        cancel: mockCancel,
        speak: mockSpeak,
      }
    };

    const mockUtteranceConstructor = mock((text: string) => {
      return {
        text,
        lang: "",
        rate: 1,
        pitch: 1
      };
    });

    // @ts-ignore
    global.SpeechSynthesisUtterance = mockUtteranceConstructor;

    // @ts-ignore
    const result = speakHealthRecord(null, "en-US");

    expect(result).toBe(true);
    expect(mockUtteranceConstructor).toHaveBeenCalledWith("");
  });

  it("should return false and log error if an exception is thrown", () => {
    const mockCancel = mock(() => {
      throw new Error("Speech synthesis failed");
    });

    // @ts-ignore
    global.window = {
      speechSynthesis: {
        cancel: mockCancel,
      }
    };

    const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

    const result = speakHealthRecord("Hello", "en-US");

    expect(result).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
