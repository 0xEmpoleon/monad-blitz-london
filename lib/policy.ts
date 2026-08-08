import { keccak256, stringToBytes, toFunctionSelector } from "viem";

export type Verdict = "ALLOW" | "DENY";

export type ReasonCode =
  | "ALLOW"
  | "POLICY_INACTIVE"
  | "POLICY_EXPIRED"
  | "INTENT_EXPIRED"
  | "WRONG_AGENT"
  | "TARGET_NOT_ALLOWED"
  | "SELECTOR_NOT_ALLOWED"
  | "PER_ACTION_LIMIT"
  | "EPOCH_LIMIT"
  | "NONCE_USED"
  | "INSUFFICIENT_BALANCE";

export type Policy = {
  principal: `0x${string}`;
  agent: `0x${string}`;
  allowedTarget: `0x${string}`;
  allowedSelector: `0x${string}`;
  maxPerAction: bigint;
  maxPerEpoch: bigint;
  epochSeconds: number;
  validUntil: number;
  active: boolean;
  balance: bigint;
};

export type Intent = {
  agent: `0x${string}`;
  target: `0x${string}`;
  selector: `0x${string}`;
  value: bigint;
  nonce: bigint;
  deadline: number;
};

export type PolicyState = {
  epochSpend: bigint;
  usedNonces: Set<bigint>;
};

export type Decision = {
  verdict: Verdict;
  reason: ReasonCode;
  projectedSpend: bigint;
};

export type MutationResult = {
  id: string;
  attack: string;
  threat: string;
  naive: Verdict;
  hardened: Verdict;
  reason: ReasonCode;
  killed: boolean;
  trace: string[];
};

export const DEMO_NOW = 2_000_000_000;
export const MON = 10n ** 18n;

export const DEMO_POLICY: Policy = {
  principal: "0x5A0d2d0d574898E09Bf25d77B5c6BB2319Abe411",
  agent: "0xA93Daf4Ac659AAc726FFc15eDf6B5A51a93B8d12",
  allowedTarget: "0xB10C53693B7bCB2C7b2A8014F33B0d5f9Aaef700",
  allowedSelector: toFunctionSelector("buy(bytes32)"),
  maxPerAction: 6n * MON,
  maxPerEpoch: 10n * MON,
  epochSeconds: 3_600,
  validUntil: DEMO_NOW + 86_400,
  active: true,
  balance: 20n * MON,
};

export function emptyState(): PolicyState {
  return { epochSpend: 0n, usedNonces: new Set<bigint>() };
}

export function assessIntent(
  policy: Policy,
  intent: Intent,
  state: PolicyState,
  now = DEMO_NOW,
): Decision {
  const deny = (reason: ReasonCode, projectedSpend = state.epochSpend) => ({
    verdict: "DENY" as const,
    reason,
    projectedSpend,
  });

  if (!policy.active) return deny("POLICY_INACTIVE");
  if (now > policy.validUntil) return deny("POLICY_EXPIRED");
  if (now > intent.deadline) return deny("INTENT_EXPIRED");
  if (intent.agent.toLowerCase() !== policy.agent.toLowerCase()) {
    return deny("WRONG_AGENT");
  }
  if (intent.target.toLowerCase() !== policy.allowedTarget.toLowerCase()) {
    return deny("TARGET_NOT_ALLOWED");
  }
  if (intent.selector.toLowerCase() !== policy.allowedSelector.toLowerCase()) {
    return deny("SELECTOR_NOT_ALLOWED");
  }
  if (intent.value > policy.maxPerAction) return deny("PER_ACTION_LIMIT");
  if (state.usedNonces.has(intent.nonce)) return deny("NONCE_USED");
  if (intent.value > policy.balance - state.epochSpend) {
    return deny("INSUFFICIENT_BALANCE");
  }

  const projectedSpend = state.epochSpend + intent.value;
  if (projectedSpend > policy.maxPerEpoch) {
    return deny("EPOCH_LIMIT", projectedSpend);
  }

  return { verdict: "ALLOW", reason: "ALLOW", projectedSpend };
}

export function naiveAssess(policy: Policy, intent: Intent): Decision {
  if (intent.value > policy.maxPerAction) {
    return {
      verdict: "DENY",
      reason: "PER_ACTION_LIMIT",
      projectedSpend: intent.value,
    };
  }
  return { verdict: "ALLOW", reason: "ALLOW", projectedSpend: intent.value };
}

export function applyAllowedIntent(
  state: PolicyState,
  intent: Intent,
  decision: Decision,
): PolicyState {
  if (decision.verdict !== "ALLOW") return state;
  return {
    epochSpend: decision.projectedSpend,
    usedNonces: new Set([...state.usedNonces, intent.nonce]),
  };
}

export function policyHash(policy: Policy): `0x${string}` {
  const canonical = [
    policy.principal.toLowerCase(),
    policy.agent.toLowerCase(),
    policy.allowedTarget.toLowerCase(),
    policy.allowedSelector.toLowerCase(),
    policy.maxPerAction.toString(),
    policy.maxPerEpoch.toString(),
    policy.epochSeconds.toString(),
    policy.validUntil.toString(),
    policy.active ? "1" : "0",
  ].join("|");
  return keccak256(stringToBytes(canonical));
}

function baseIntent(overrides: Partial<Intent> = {}): Intent {
  return {
    agent: DEMO_POLICY.agent,
    target: DEMO_POLICY.allowedTarget,
    selector: DEMO_POLICY.allowedSelector,
    value: 1n * MON,
    nonce: 1n,
    deadline: DEMO_NOW + 3_600,
    ...overrides,
  };
}

export function runMutationSuite(policy = DEMO_POLICY): MutationResult[] {
  const results: MutationResult[] = [];

  const splitOne = baseIntent({ value: 6n * MON, nonce: 10n });
  const splitTwo = baseIntent({ value: 6n * MON, nonce: 11n });
  const firstDecision = assessIntent(policy, splitOne, emptyState());
  const afterFirst = applyAllowedIntent(emptyState(), splitOne, firstDecision);
  const secondDecision = assessIntent(policy, splitTwo, afterFirst);
  results.push({
    id: "split-spend",
    attack: "Split-spend race",
    threat: "Two valid-looking actions exceed the cumulative mandate.",
    naive: naiveAssess(policy, splitTwo).verdict,
    hardened: secondDecision.verdict,
    reason: secondDecision.reason,
    killed: secondDecision.verdict === "DENY",
    trace: [
      "Action A: 6 MON passes the per-action limit.",
      "Atomic state records 6 / 10 MON spent.",
      "Action B: projected spend becomes 12 MON.",
    ],
  });

  const targetSwap = baseIntent({
    target: "0x000000000000000000000000000000000000dEaD",
    nonce: 20n,
  });
  const targetDecision = assessIntent(policy, targetSwap, emptyState());
  results.push({
    id: "target-swap",
    attack: "Target substitution",
    threat: "An allowed-looking call is redirected to another contract.",
    naive: naiveAssess(policy, targetSwap).verdict,
    hardened: targetDecision.verdict,
    reason: targetDecision.reason,
    killed: targetDecision.verdict === "DENY",
    trace: [
      "Value remains below 6 MON.",
      "Destination no longer matches the committed venue.",
    ],
  });

  const selectorSwap = baseIntent({ selector: "0xdeadbeef", nonce: 30n });
  const selectorDecision = assessIntent(policy, selectorSwap, emptyState());
  results.push({
    id: "selector-swap",
    attack: "Function substitution",
    threat: "The agent calls a different function on an allowed contract.",
    naive: naiveAssess(policy, selectorSwap).verdict,
    hardened: selectorDecision.verdict,
    reason: selectorDecision.reason,
    killed: selectorDecision.verdict === "DENY",
    trace: [
      "Target remains on the allowlist.",
      "Calldata selector changes from buy(bytes32).",
    ],
  });

  const replay = baseIntent({ nonce: 40n });
  const replayFirst = assessIntent(policy, replay, emptyState());
  const replayState = applyAllowedIntent(emptyState(), replay, replayFirst);
  const replayDecision = assessIntent(policy, replay, replayState);
  results.push({
    id: "replay",
    attack: "Approval replay",
    threat: "A previously accepted intent is submitted twice.",
    naive: naiveAssess(policy, replay).verdict,
    hardened: replayDecision.verdict,
    reason: replayDecision.reason,
    killed: replayDecision.verdict === "DENY",
    trace: [
      "First execution consumes nonce 40.",
      "Second execution presents the identical nonce.",
    ],
  });

  const expired = baseIntent({ nonce: 50n, deadline: DEMO_NOW - 1 });
  const expiryDecision = assessIntent(policy, expired, emptyState());
  results.push({
    id: "expiry",
    attack: "Stale intent",
    threat: "An old action is executed after market conditions change.",
    naive: naiveAssess(policy, expired).verdict,
    hardened: expiryDecision.verdict,
    reason: expiryDecision.reason,
    killed: expiryDecision.verdict === "DENY",
    trace: [
      "Amount still looks valid.",
      "Intent deadline is already in the past.",
    ],
  });

  return results;
}

export function formatMon(value: bigint): string {
  const whole = value / MON;
  const fraction = (value % MON) / 10n ** 16n;
  return fraction === 0n
    ? `${whole.toString()} MON`
    : `${whole.toString()}.${fraction.toString().padStart(2, "0")} MON`;
}
