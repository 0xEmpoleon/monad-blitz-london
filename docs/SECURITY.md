# Security model

MandateLab is an unaudited hackathon prototype. It is designed to make security
assumptions explicit, not to claim production custody readiness.

## Protected asset

The protected asset is native MON deposited into a policy-specific balance in
`MandateExecutor`. The principal delegates a bounded execution envelope to one
agent. The agent never gains principal withdrawal authority.

## Roles

| Role | Authority |
| --- | --- |
| Principal | Creates, deactivates, funds, and withdraws from a policy |
| Agent | Executes intents only when every policy condition passes |
| Target | Receives an allowed external call and native value |
| API/UI | Computes an advisory trace; has no onchain approval power |
| RPC/provider | Transports reads and transactions; does not define policy truth |

## Threat assumptions

The MVP assumes:

- the agent key can be malicious, compromised, or prompt-injected;
- the agent can reorder, repeat, delay, or alter intents;
- multiple individually valid actions can arrive close together;
- an allowed target can revert;
- the web application or advisory API can be stale or unavailable;
- the principal key remains trusted;
- the Solidity compiler and Monad execution environment behave correctly.

The MVP does not protect a compromised principal key or malicious governance
outside the executor.

## Onchain invariants

For each policy:

1. Only the configured agent can call `executeIntent` successfully.
2. Only the exact target and first four calldata bytes are allowed.
3. `intent.value` cannot exceed `maxPerAction`.
4. Successful value in an epoch cannot exceed `maxPerEpoch`.
5. A nonce succeeds at most once.
6. Neither the policy nor the intent can execute after its deadline.
7. Successful value cannot exceed the policy's funded balance.
8. The principal can deactivate the policy and withdraw unused funds.
9. State is updated before the external call.
10. If the target call fails, nonce, spend, and balance changes revert atomically.

## Adversarial mutation matrix

| Mutation | Preserved fields | Changed field or sequence | Required denial |
| --- | --- | --- | --- |
| Split spend | Agent, target, selector, each value | Two actions exceed the epoch total | `EPOCH_LIMIT` |
| Target substitution | Agent, selector, value, deadline | Target | `TARGET_NOT_ALLOWED` |
| Function substitution | Agent, target, value, deadline | Selector/calldata | `SELECTOR_NOT_ALLOWED` |
| Replay | Entire original payload | Reuse nonce | `NONCE_USED` |
| Stale intent | Agent, target, selector, value | Wait beyond deadline | `INTENT_EXPIRED` |

Additional contract tests cover downstream failure rollback and principal-only
withdrawal behavior.

## Execution order

`executeIntent` follows checks-effects-interactions:

1. Resolve policy.
2. Validate policy state and deadlines.
3. Validate caller, target, and selector.
4. Validate per-action cap, nonce, balance, and projected epoch spend.
5. Mark nonce used.
6. Store projected epoch spend.
7. Deduct the policy balance.
8. Call the allowed target.
9. Emit `IntentExecuted`.

The function is protected by OpenZeppelin `ReentrancyGuard`. A revert from the
target reverts the entire transaction, including the effects in steps 5–7.

## Hash domain separation

Policy and intent hashes include:

- `block.chainid`;
- the executor contract address;
- the policy ID;
- all relevant policy or intent fields.

This prevents a hash from being treated as portable approval across chains,
executor deployments, or policy IDs. The hashes are commitments and audit
identifiers; the MVP does not implement an EIP-712 signature flow.

## Fail-closed behavior

Malformed API requests return `DENY / MALFORMED_REQUEST`. Short calldata maps to
the zero selector and cannot satisfy a non-zero policy selector. Unknown policy
IDs, missing balances, reused nonces, and expired deadlines deny execution.

## Known limitations

- Native MON value is the only economic amount measured. ERC-20 transfers,
  approvals, and protocol-specific token effects need adapters.
- Target-plus-selector binding does not inspect function arguments beyond the
  selector.
- One target and one selector are supported per policy.
- Epochs use fixed timestamp buckets, not a rolling window.
- No oracle, slippage, portfolio exposure, or price-impact checks exist.
- No EIP-712 principal signature or relayer path exists.
- No upgrade mechanism exists. Policies are replaced by creating a new policy
  and deactivating the old one.
- No formal verification, fuzz campaign, invariant runner, audit, or bug bounty
  has been completed.
- Frontend wallet connection is a convenience and not an authentication system.
- The deterministic TypeScript engine is a reference implementation; only the
  contract is authoritative for value movement.

## Pre-mainnet requirements

Before any production or mainnet use:

- commission an independent audit;
- add invariant and stateful fuzz testing;
- add protocol-specific calldata/value accounting;
- define emergency and incident-response procedures;
- add monitoring for deactivation, withdrawals, and anomalous denials;
- review gas limits and RPC failure behavior on Monad;
- verify every deployment and publish source;
- use a hardware-backed principal and separate deployment authority;
- cap test exposure until operational controls are proven.

## Reporting

For the hackathon, report issues through the repository's GitHub issue tracker
without including private keys, seed phrases, or exploitable production secrets.
