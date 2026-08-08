# MandateLab build plan

Last updated: 8 August 2026  
Release: `main` via PR #1 from `build/mandatelab-mvp`  
Target: Monad Blitz London

## Product decision

Build MandateLab: an adversarial test bench and deterministic onchain judge for
agentic trades and payments.

The three-minute proof is:

1. Load a mandate with a `6 MON` per-action cap and `10 MON` epoch cap.
2. Generate two individually valid `6 MON` actions.
3. Show why a stateless guard allows both.
4. Show the onchain policy deny the second action atomically.
5. Kill target, selector, replay, and expiry mutations.
6. Execute one safe action and open the Monad receipt.

## Build status

| Workstream | Status | Exit condition |
| --- | --- | --- |
| Competitive and design research | Complete | Mutation-testing wedge and evidence-first visual system selected |
| Smart-contract MVP | Complete locally | 5 tests passing |
| Reference policy engine | Complete | 3 tests passing |
| Landing page and Policy Lab | Complete and live | Production interaction, APIs, and evidence ledger checked |
| Brand kit | Complete | Transparent mark + dark submission header integrated |
| Production web build | Complete | `npm run build` passing |
| Submission README/docs | Complete | Setup, differentiation, security, portal copy |
| Presentation | Complete | Five-slide PPTX and PDF rendered, inspected, and overflow-tested |
| Vercel | Complete | https://mandatelab.vercel.app verified |
| GitHub handoff | Complete | PR #1 merged into `main`; Vercel checks green |
| Monad deployment | Blocked on event key/window | Verified testnet addresses and receipts |

## Implemented scope

- `MandateExecutor.sol` with policy creation, funding, deactivation, withdrawal,
  preview, and atomic execution.
- `DemoMarket.sol` plus a failing target for rollback tests.
- Agent, target, selector, cap, epoch, deadline, nonce, balance, and activity
  checks.
- Split-spend, target substitution, function substitution, replay, and stale
  intent mutations.
- Stable reason traces in TypeScript and Solidity.
- Next.js landing page, Policy Lab, health route, and judge route.
- Monad Testnet configuration for chain ID `10143`.
- Dark brand and submission assets.
- Matte-black evidence-led redesign and complete design DNA profile.

## Deliberate cuts

These remain out of the MVP until qualification is complete:

- server-side approval signer;
- an LLM in the execution path;
- custody or account-abstraction stack;
- real DEX routing;
- ERC-20/approval parsing;
- oracle, slippage, and portfolio limits;
- multi-agent quorum;
- generic MCP wallet tooling;
- mainnet deployment.

## Remaining critical path

### 1. Deploy contracts during the Blitz

- Confirm the event deployment window.
- Fund a dedicated Monad Testnet account.
- Store the private key only in local `.env.local`.
- Run contract tests immediately before deployment.
- Deploy `MandateExecutor` and `DemoMarket`.
- Verify chain, bytecode, timestamps, and receipts.
- Store only public addresses in Vercel.
- Re-deploy the web app so explorer links activate.

### 2. Publish the verified onchain evidence

- Add public contract addresses to Vercel environment variables.
- Redeploy the web app so explorer links activate.
- Add explorer links to README, the deck, and the portal copy.
- Re-run the live allow and deny paths.

### 3. Submit and rehearse

- Paste the portal copy from `docs/SUBMISSION.md`.
- Upload `public/brand/mandatelab-header-dark.png`.
- Add exact team members, GitHub, live demo, contract, and video URLs.
- Re-open the portal record and test every link.
- Rehearse the demo under three minutes with a backup screen recording.

## Release gates

The product is submission-ready only when all are true:

- public fork contains the tested code;
- Vercel app is reachable without local services;
- contracts were deployed within the valid event window;
- explorer links prove the deployment and safe execution;
- README and portal show the same URLs and addresses;
- one allowed and one denied intent have been tested in production;
- no private key or secret appears in git history;
- the demo completes in three minutes.

## Stretch order

After every release gate passes:

1. export a signed mutation report;
2. add one protocol-specific Monad DeFi adapter;
3. add ERC-20 amount/allowance mutations;
4. expose a single read-only `judge_intent` MCP tool;
5. add exact-intent human exception approval;
6. add an indexed execution and denial history.
