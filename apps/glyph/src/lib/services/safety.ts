/**
 * Client service for the prescription safety check. Calls the edge function and
 * shapes the result. ANY failure (network, HTTP, malformed) becomes failedResult
 * — the surface then shows "couldn't run", never a green light.
 */
import { invokeFunction } from "./ai-invoke";
import { buildSafetyResult, failedResult, type SafetyResult, type RawSafetyData } from "./safety-logic";

interface MedInput { name?: string; dose?: string; frequency?: string; duration?: string; instructions?: string }

const TIMEOUT_MS = 12000;

export async function checkPrescriptionSafety(
  visitId: string,
  medications: MedInput[],
): Promise<SafetyResult> {
  try {
    const raw = await Promise.race([
      invokeFunction<RawSafetyData>("check-prescription-safety", { visitId, medications }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("safety check timed out")), TIMEOUT_MS)),
    ]);
    return buildSafetyResult(raw);
  } catch (err) {
    return failedResult(err instanceof Error ? err.message : "safety check failed");
  }
}
