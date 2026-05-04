import { expect, it, describe, beforeEach, afterEach, jest } from "bun:test";
import { constructPrompt, fetchHealthPlanFromLLM } from "./health-plan-generator";

describe('health-plan-generator', () => {
    describe('constructPrompt', () => {
        it('should correctly insert variables into the prompt', () => {
            const prompt = constructPrompt("30", "Male", "Flu", "en");
            expect(prompt).toContain("Age: 30");
            expect(prompt).toContain("Gender: Male");
            expect(prompt).toContain('Diagnosis: "Flu"');
            expect(prompt).toContain("Language: en");
        });
    });

    describe('fetchHealthPlanFromLLM', () => {
        const originalConsoleError = console.error;

        beforeEach(() => {
            global.fetch = jest.fn();
            console.error = jest.fn();
        });

        afterEach(() => {
            console.error = originalConsoleError;
        });

        it('should successfully parse a valid JSON response from ML server', async () => {
            const mockPlan = { overview: "You are doing great." };
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response: JSON.stringify(mockPlan)
                })
            });

            const prompt = "test prompt";
            const result = await fetchHealthPlanFromLLM(prompt);

            expect(global.fetch).toHaveBeenCalledWith('http://localhost:4000/api/bot/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 1500,
                    temperature: 0.1,
                    role: "doctor"
                })
            });

            expect(result).toEqual(mockPlan);
        });

        it('should correctly strip markdown from JSON response', async () => {
            const mockPlan = { overview: "You are doing great." };
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response: "```json\n" + JSON.stringify(mockPlan) + "\n```"
                })
            });

            const result = await fetchHealthPlanFromLLM("test");
            expect(result).toEqual(mockPlan);
        });

        it('should fallback to an error object if JSON parsing fails', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    response: "Invalid JSON string"
                })
            });

            const result = await fetchHealthPlanFromLLM("test");
            expect(result).toHaveProperty('overview', "AI Generation failed to format correctly. Please try again.");
            expect(console.error).toHaveBeenCalled();
        });

        it('should throw an error if the fetch response is not ok', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false
            });

            expect(fetchHealthPlanFromLLM("test")).rejects.toThrow("Failed to generate plan from AI");
        });
    });
});
