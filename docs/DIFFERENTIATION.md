# MandateLab differentiation

## Strategic position

MandateLab is not a new agent wallet, a transaction simulator, or a generic
allow/deny firewall. It is an adversarial assurance layer for financial
authority:

> Generate mutations of an agent's mandate, measure which bypasses survive, and
> enforce the tested policy with the same deterministic rules on Monad.

That sentence is the product boundary. If a feature does not strengthen the
mutation-to-enforcement proof, it is out of the hackathon MVP.

## Evidence from the Blitz landscape

The public [Blitz Showcase API](https://blitz.devnads.com/api/showcase) exposes
more than 1,300 project records. Agent wallets, DeFi automation, payment guards,
session permissions, simulations, reputation, and approval workflows recur
across events. Adjacent examples include Castle, AgentTrust, AgentTab, MONAD
GATE, Premon, AgentX, Agent Vault, Synod, AgMON, and WICK.

The recurring feature set is already strong:

- session keys and delegated wallets;
- target and function allowlists;
- daily or per-action spend caps;
- preflight simulation;
- human approval and escalation;
- reputation or trust scores;
- agent-triggered swaps and payments.

Competing by adding one more cap or one more approval channel would produce a
crowded, difficult-to-explain submission. MandateLab instead evaluates whether
those policy primitives hold under adversarial composition.

## Competitive boundary

| Adjacent product type | What it optimizes | MandateLab boundary |
| --- | --- | --- |
| Delegated agent wallet | Let an agent act inside configured permissions | Test whether the configured permissions contain bypasses before relying on them |
| Transaction simulator | Predict whether one transaction succeeds or changes state | Mutate authority across multiple intents, including cumulative and replay failures |
| Transaction firewall | Classify or block suspicious actions | Produce deterministic mutation coverage tied to exact policy semantics |
| Human approval workflow | Escalate large or unusual actions | Reduce what requires escalation and prove what remains automatically enforceable |
| Reputation system | Estimate whether an agent is trustworthy | Assume the agent can be compromised and constrain the resulting authority |
| Strategy automation | Execute trading rules | Judge the execution envelope independently from the strategy's alpha |

Castle is the closest visible overlap: its public README describes session keys,
caps, target and selector restrictions, simulation, and emergency controls.
Those are execution guardrails. MandateLab's wedge is the missing assurance
step: automatically attacking a mandate and reporting the exact classes of
bypass it kills.

The London field adds one especially close comparison. Authored Objectives
authors terms, allows bounded self-correction, records residuals, and asks
payments to cite their objective. Guardian combines static limits with a
behavioral anomaly baseline. MandateLab does neither objective authorship nor
behavior scoring: it generates a reproducible adversarial suite before use and
binds the resulting mutation coverage to the exact policy commitment enforced
at runtime. Even a fully compromised model receives no discretion to reinterpret
that commitment.

AgMON is another useful contrast. It focuses on creating and running automated
portfolio strategies. MandateLab is strategy-agnostic: it does not decide what
trade is profitable; it decides whether the agent still has only the authority
the principal intended.

## Novel mechanic

The demo's core mechanic is policy mutation testing:

1. Begin with one signed or committed mandate.
2. Derive valid-looking intents that preserve some fields and mutate others.
3. Run each against a naive reference and the hardened policy engine.
4. Report a stable reason code and mutation score.
5. Bind the score to a deterministic policy hash.
6. Recheck live state and execute atomically onchain.

This is legible in three minutes because the audience sees attacks die rather
than listening to a list of security features.

## Why the API is not the product's trust root

An offchain judge can be stale, unavailable, compromised, or raced. MandateLab's
`POST /api/judge-intent` endpoint therefore returns an advisory trace only. It
does not sign an approval and cannot move funds.

`MandateExecutor.executeIntent` is the authority boundary. It rechecks:

- policy activity and expiry;
- intent expiry;
- caller identity;
- target and selector;
- per-action cap;
- nonce use;
- delegated balance;
- cumulative epoch spend.

It then marks the nonce, accounts for spend, deducts the policy balance, and only
then performs the external call. This preserves the mutation-to-runtime claim.

## Why Monad is a product requirement

The value of an onchain judge declines if it is too slow or expensive to remain
in the agent's execution path. Monad's low-latency EVM makes stateful enforcement
compatible with frequent machine-generated intents.

Monad's serial-equivalent execution semantics are also central to the demo. Two
actions can arrive close together, but the contract's cumulative counter still
has one canonical ordered result. MandateLab demonstrates why a stateless
offchain per-action check is insufficient and why atomic onchain accounting is
the correct final judge.

The executor's target-plus-selector binding is protocol-neutral. A production
adapter can sit in front of Monad spot venues, lending protocols, rebalancers,
or agent-payment routers without replacing their liquidity or settlement.

## Defensible follow-on product

The hackathon MVP tests five generic authority mutations. The longer-term moat is
an expanding, versioned mutation corpus:

- protocol-specific calldata mutations;
- token approval and allowance escalation;
- slippage and price-impact mutations;
- oracle freshness and market-state mutations;
- cross-protocol exposure and portfolio concentration;
- multi-call and callback/reentrancy sequences;
- x402/MPP replay and recipient substitution;
- regression reports across policy versions.

Each adapter contributes reusable adversarial fixtures, while the deterministic
executor remains small.

## Anti-features for the Blitz build

Do not add these before the app, README, Vercel URL, and Monad deployment are
complete:

- a new custody or wallet stack;
- an LLM in the authorization path;
- a generic MCP server with many wallet tools;
- natural-language policy generation;
- multi-agent consensus;
- arbitrary DEX routing;
- mainnet custody claims;
- an unverified security score.

The winning proof is one safe action, five killed mutations, and one verified
Monad receipt.

## Pitch lines

Primary:

> MandateLab breaks an agent's mandate before the agent does, then enforces the
> surviving policy atomically on Monad.

Technical:

> Mutation testing for autonomous financial authority, with deterministic
> reason codes and onchain runtime enforcement.

Business:

> CI for the permissions behind agentic trades and payments.
