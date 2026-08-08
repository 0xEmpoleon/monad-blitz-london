import {
  DEMO_NOW,
  assessIntent,
  emptyState,
  type Intent,
  type Policy,
} from "@/lib/policy";

function parsePolicy(input: Record<string, unknown>): Policy {
  return {
    principal: String(input.principal) as `0x${string}`,
    agent: String(input.agent) as `0x${string}`,
    allowedTarget: String(input.allowedTarget) as `0x${string}`,
    allowedSelector: String(input.allowedSelector) as `0x${string}`,
    maxPerAction: BigInt(String(input.maxPerAction)),
    maxPerEpoch: BigInt(String(input.maxPerEpoch)),
    epochSeconds: Number(input.epochSeconds),
    validUntil: Number(input.validUntil),
    active: Boolean(input.active),
    balance: BigInt(String(input.balance)),
  };
}

function parseIntent(input: Record<string, unknown>): Intent {
  return {
    agent: String(input.agent) as `0x${string}`,
    target: String(input.target) as `0x${string}`,
    selector: String(input.selector) as `0x${string}`,
    value: BigInt(String(input.value)),
    nonce: BigInt(String(input.nonce)),
    deadline: Number(input.deadline),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const policy = parsePolicy(body.policy as Record<string, unknown>);
    const intent = parseIntent(body.intent as Record<string, unknown>);
    const state = emptyState();
    state.epochSpend = BigInt(String(body.epochSpend ?? "0"));
    state.usedNonces = new Set(
      ((body.usedNonces as unknown[]) ?? []).map((nonce) =>
        BigInt(String(nonce)),
      ),
    );

    const decision = assessIntent(
      policy,
      intent,
      state,
      Number(body.now ?? DEMO_NOW),
    );

    return Response.json({
      ...decision,
      projectedSpend: decision.projectedSpend.toString(),
      authority: "advisory-reference-engine",
      enforcement: "MandateExecutor.executeIntent",
    });
  } catch {
    return Response.json(
      {
        verdict: "DENY",
        reason: "MALFORMED_REQUEST",
        authority: "fail-closed",
      },
      { status: 400 },
    );
  }
}
