import { speakText } from './ml-client';
import { expect, it, describe, beforeEach, afterEach, jest } from "bun:test";

describe('speakText', () => {
    const originalConsoleError = console.error;

    beforeEach(() => {
        global.fetch = jest.fn();
        console.error = jest.fn();
    });

    afterEach(() => {
        console.error = originalConsoleError;
    });

    it('should return a Blob when the fetch request is successful', async () => {
        const mockBlob = { size: 10, type: 'audio/mpeg' };
        (global.fetch as any).mockResolvedValue({
            ok: true,
            blob: jest.fn().mockResolvedValue(mockBlob)
        });

        const result = await speakText('hello');

        expect(global.fetch).toHaveBeenCalledWith('http://localhost:4000/api/bot/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'hello' })
        });
        expect(result).toBe(mockBlob as any);
    });

    it('should return null and log an error when the response is not okay', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            status: 500
        });

        const result = await speakText('hello');

        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith('TTS client error:', expect.any(Error));
    });

    it('should return null and log an error when fetch throws an exception', async () => {
        (global.fetch as any).mockRejectedValue(new Error('Network error'));

        const result = await speakText('hello');

        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith('TTS client error:', expect.any(Error));
    });
});
