import type { NormalizedInbound } from "./types";
import { extractBindCode } from "./binding";

export type RouteAction =
  | { kind: "ignore"; reason: string }
  | { kind: "onboard" }
  | { kind: "bind"; code: string }
  | { kind: "reply"; text: string };

export interface RouteContext {
  bound: boolean;
}

/**
 * Pure routing for Leg A. Bound patients get an echo placeholder (Leg B
 * replaces this with triage/wallet routing). Unbound numbers are offered the
 * binding/onboarding path only — never auto-registered (self-reg is deferred).
 */
export function decideRoute(inbound: NormalizedInbound, ctx: RouteContext): RouteAction {
  if (inbound.kind === "unhandled") return { kind: "ignore", reason: "unhandled message type" };

  if (!ctx.bound) {
    const code = inbound.kind === "text" ? extractBindCode(inbound.text) : null;
    return code ? { kind: "bind", code } : { kind: "onboard" };
  }

  // Bound. Leg A: echo. (Leg B routes to triage / wallet / etc.)
  return { kind: "reply", text: inbound.text || "" };
}
