# Monad Blitz London submission pack

This document follows the useful patterns visible in winning Blitz repositories:
lead with live links, explain the problem in plain language, show the demo flow,
publish architecture and contract details, give exact setup commands, and state
security limitations honestly.

## Ready-to-paste portal copy

### Title

MandateLab

### Tagline

Break the mandate before the agent does.

### One-line description

Mutation testing and deterministic onchain enforcement for agentic trades and
payments on Monad.

### Full description

MandateLab red-teams the authority given to autonomous financial agents. It
starts from an exact mandate—agent, target, function, caps, expiry, and
capital—then generates valid-looking attack mutations such as split spending,
target substitution, function substitution, replay, and stale intent execution.
The Policy Lab shows which mutations a naive guard would miss, returns stable
denial reasons, and binds the result to a deterministic policy hash.

The API is advisory. Funds can move only through `MandateExecutor` on Monad,
which rechecks live policy state, consumes the nonce, and accounts for cumulative
spend before calling the target. This makes the product mutation testing for
financial authority rather than another agent wallet or generic transaction
firewall.

### Suggested category

Primary: `DeFi / AI Agents`

Secondary if the portal supports it: `Security / Infrastructure`

### Links

| Field | Value |
| --- | --- |
| GitHub | https://github.com/0xEmpoleon/monad-blitz-london |
| Live demo | https://mandatelab.vercel.app |
| Demo video | `ADD_VIDEO_URL_IF_RECORDED` |
| Tweet | `ADD_TWEET_URL_IF_POSTED` |
| Executor | `ADD_EXECUTOR_EXPLORER_URL` |
| Demo market | `ADD_DEMO_MARKET_EXPLORER_URL` |

### Team

Add the exact names and handles used in the Blitz portal. Do not infer or invent
team members from GitHub commit metadata.

## Three-minute pitch

### 0:00–0:25 — Problem

“Agent wallets already have caps and allowlists. The problem is that a policy can
look safe and still be bypassed when actions are split, replayed, redirected, or
executed after their intended window.”

### 0:25–0:45 — Thesis

“MandateLab is mutation testing for agentic financial authority. We break the
mandate before the agent does, then enforce the tested policy on Monad.”

### 0:45–1:45 — Live mutation suite

1. Show the prefilled mandate: `6 MON` per action, `10 MON` per epoch.
2. Run the suite.
3. Select split-spend and explain that a naive per-action checker accepts both
   actions while the executor denies the second.
4. Click target substitution, selector substitution, replay, and expiry to show
   stable reason codes.

### 1:45–2:25 — Onchain proof

1. Execute one safe intent.
2. Show the Monad explorer receipt and `IntentExecuted` event.
3. Show one denied intent.
4. State: “The API explains; the contract decides.”

### 2:25–2:50 — Why Monad

“Autonomous finance produces frequent, concurrent intents. Monad's low-latency
EVM keeps a stateful guardrail in the critical path, while serial-equivalent
execution makes cumulative caps atomically correct. The same executor can front
Monad trading, lending, rebalancing, or machine-payment adapters.”

### 2:50–3:00 — Close

“MandateLab is CI for the permissions behind agentic trades and payments.”

## Final qualification checklist

### Repository

- [x] Forked from the required London starter.
- [x] Push the tested product branch to the public fork.
- [x] README explains what it does and how to run it.
- [x] `.env.example` contains no secret value.
- [x] Contract and policy tests pass.
- [x] Merge PR #1 from the tested branch into `main` with passing Vercel checks.

### Monad

- [ ] Confirm the official event start and deployment window.
- [ ] Fund a dedicated Monad Testnet deployer.
- [ ] Put `DEPLOYER_PRIVATE_KEY` only in local `.env.local`.
- [ ] Deploy `MandateExecutor` and `DemoMarket` during the event.
- [ ] Verify chain ID `10143`, receipts, bytecode, and timestamps.
- [ ] Record contract addresses and deployment transaction hashes.
- [ ] Add verified explorer links to README, portal, and deck.
- [ ] Run one allowed and one denied action against the deployment.

### Web

- [x] Production build passes locally.
- [x] Health endpoint returns `status: ok`.
- [x] Judge endpoint fails closed and returns stable denial reasons.
- [x] Desktop interaction and browser console checked.
- [x] Authenticate Vercel CLI.
- [x] Deploy the exact tested source.
- [ ] Add public contract addresses as Vercel environment variables.
- [x] Test the public URL, health route, judge route, assets, and Policy Lab.

### Portal

- [ ] Add title, one-line and full description.
- [ ] Select the London event and correct category.
- [ ] Add every team member exactly.
- [ ] Add GitHub, demo, contract, video, and tweet URLs.
- [ ] Upload the dark submission header.
- [ ] Submit before the stated freeze.
- [ ] Re-open the entry and verify every link.

## Deployment handoff from VS Code

```bash
cd /Users/toshinoriishibashi/Documents/Codex/2026-08-06/re/monad-blitz-london
code .
git switch build/mandatelab-mvp
npm install
npm test
npm run build
```

For future changes, create a small branch, verify it, then push and deploy:

```bash
git switch -c update/mandatelab
npm test
npm run build
git push -u origin update/mandatelab
npx vercel --prod
```

For Monad, create `.env.local` locally and never paste the private key into chat
or commit it. Run:

```bash
npm run contracts:deploy:testnet
```

Copy only the resulting public addresses into Vercel and the repository.

## Assets

- Transparent logo: `public/brand/mandatelab-logo.png`
- Dark landing/submission header: `public/brand/mandatelab-header-dark.png`
- Presentation: `MandateLab-Monad-Blitz.pptx` and PDF companion in the deliverables folder
- Adversarial idea analysis: generated separately as a PDF
