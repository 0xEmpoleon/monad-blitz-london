import { describe, expect, it } from "vitest";
import {
  DEMO_POLICY,
  MON,
  assessIntent,
  emptyState,
  runMutationSuite,
} from "./policy";

describe("policy mutation engine", () => {
  it("kills every bundled authority mutation", () => {
    const results = runMutationSuite();
    expect(results).toHaveLength(5);
    expect(results.every((result) => result.naive === "ALLOW")).toBe(true);
    expect(results.every((result) => result.hardened === "DENY")).toBe(true);
    expect(results.every((result) => result.killed)).toBe(true);
  });

  it("allows an intent exactly at the action cap", () => {
    const decision = assessIntent(
      DEMO_POLICY,
      {
        agent: DEMO_POLICY.agent,
        target: DEMO_POLICY.allowedTarget,
        selector: DEMO_POLICY.allowedSelector,
        value: 6n * MON,
        nonce: 100n,
        deadline: 2_000_003_600,
      },
      emptyState(),
    );
    expect(decision.verdict).toBe("ALLOW");
  });

  it("fails closed on malformed authority", () => {
    const decision = assessIntent(
      DEMO_POLICY,
      {
        agent: DEMO_POLICY.agent,
        target: DEMO_POLICY.allowedTarget,
        selector: "0x00000000",
        value: 1n * MON,
        nonce: 101n,
        deadline: 2_000_003_600,
      },
      emptyState(),
    );
    expect(decision.reason).toBe("SELECTOR_NOT_ALLOWED");
  });
});
