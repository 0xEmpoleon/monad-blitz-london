"use client";

import Image from "next/image";
import { useMemo, useState, type KeyboardEvent } from "react";
import {
  DEMO_POLICY,
  formatMon,
  policyHash,
  runMutationSuite,
  type MutationResult,
} from "@/lib/policy";
import {
  deploymentReady,
  executorAddress,
  monadTestnet,
} from "@/lib/monad";

const short = (value: string, left = 6, right = 4) =>
  `${value.slice(0, left)}…${value.slice(-right)}`;

export function MandateLabApp() {
  const [results, setResults] = useState<MutationResult[]>(() =>
    runMutationSuite(),
  );
  const [activeId, setActiveId] = useState("split-spend");
  const [runCount, setRunCount] = useState(1);
  const [account, setAccount] = useState<string>();
  const [walletNote, setWalletNote] = useState<string>();

  const hash = useMemo(() => policyHash(DEMO_POLICY), []);
  const active = results.find((result) => result.id === activeId) ?? results[0];
  const killed = results.filter((result) => result.killed).length;

  const runSuite = () => {
    setResults(runMutationSuite());
    setRunCount((count) => count + 1);
  };

  const moveAttackFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;

    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % results.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + results.length) % results.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = results.length - 1;

    setActiveId(results[nextIndex].id);
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    );
    tabs?.[nextIndex]?.focus();
  };

  const connectWallet = async () => {
    const ethereum = (window as Window & {
      ethereum?: { request: (args: { method: string }) => Promise<unknown> };
    }).ethereum;
    if (!ethereum) {
      setWalletNote("Install or open an EVM wallet to connect.");
      return;
    }
    try {
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      setAccount(accounts[0]);
      setWalletNote("Wallet connected. Monad execution unlocks after deployment.");
    } catch {
      setWalletNote("Wallet connection was cancelled.");
    }
  };

  return (
    <main>
      <div className="landing-header">
        <nav className="nav shell" aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="MandateLab home">
            <Image
              className="brand-logo"
              src="/brand/mandatelab-logo.png"
              alt=""
              width={36}
              height={36}
              priority
            />
            <span>MandateLab</span>
          </a>
          <div className="nav-links">
            <a href="#lab">Policy Lab</a>
            <a href="#monad">Why Monad</a>
            <a href="https://github.com/0xEmpoleon/monad-blitz-london">GitHub</a>
          </div>
          <button className="wallet-button" onClick={connectWallet}>
            <span className="status-dot" />
            {account ? short(account) : "Connect wallet"}
          </button>
        </nav>

        <section className="hero shell" id="top">
          <div className="hero-content">
            <div className="hero-meta">
              <span>RUNBOOK / ML-05</span>
              <span>MONAD / 10143</span>
              <span>{deploymentReady ? "ONCHAIN" : "PROOF MODE"}</span>
            </div>
            <h1>
              Break the mandate
              <br />
              <span>before the agent does.</span>
            </h1>
            <p className="hero-copy">
              Give an agent a 6 MON action limit. We split, replay, retarget,
              and expire its intent. If one bypass survives, the mandate fails.
            </p>
            <div className="hero-actions">
              <button className="primary-action" onClick={runSuite}>
                Run 5 attacks
              </button>
              <a className="secondary-action" href="#lab">
                Read the mandate
              </a>
            </div>
            {walletNote ? <p className="wallet-note">{walletNote}</p> : null}
          </div>

          <aside className="hero-console" aria-label="Latest mutation run">
            <div className="console-topline">
              <span>RUN ML-{String(runCount).padStart(4, "0")}</span>
              <strong>{killed}/{results.length} BLOCKED</strong>
            </div>
            <div className="console-policy">
              <span>POLICY</span>
              <code>{short(hash, 12, 8)}</code>
              <span>{formatMon(DEMO_POLICY.maxPerAction)} / action</span>
              <span>{formatMon(DEMO_POLICY.maxPerEpoch)} / epoch</span>
            </div>
            <ol className="console-results" key={runCount}>
              {results.map((result, index) => (
                <li key={result.id}>
                  <button onClick={() => setActiveId(result.id)}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <b>{result.attack}</b>
                    <code>{result.reason}</code>
                  </button>
                </li>
              ))}
            </ol>
            <div className="console-footer" aria-live="polite">
              RUN {runCount} COMPLETE · {killed} MUTATIONS KILLED · 0 SURVIVED
            </div>
          </aside>

          <div className="run-ledger" aria-label="Proof summary">
            <span>FIXTURE 08A</span>
            <strong>{killed}/{results.length} MUTATIONS BLOCKED</strong>
            <span>POLICY {short(hash, 10, 6)}</span>
            <span>{deploymentReady ? "MONAD TESTNET" : "DETERMINISTIC LOCAL PROOF"}</span>
          </div>
        </section>
      </div>

      <section className="lab-section shell" id="lab">
        <div className="section-heading">
          <div>
            <span className="section-index">POLICY LAB / FIXTURE 08A</span>
            <h2>Five attacks. One exact mandate.</h2>
          </div>
          <p>
            Each payload preserves enough valid fields to fool a partial check.
            The executor must return a specific reason for every denial.
          </p>
        </div>

        <div className="lab-grid">
          <aside className="policy-panel">
            <div className="panel-topline">
              <span>Signed mandate</span>
              <span className="live-pill">DEMO POLICY</span>
            </div>
            <dl className="policy-list">
              <div>
                <dt>Agent</dt>
                <dd className="mono">{short(DEMO_POLICY.agent)}</dd>
              </div>
              <div>
                <dt>Venue</dt>
                <dd className="mono">{short(DEMO_POLICY.allowedTarget)}</dd>
              </div>
              <div>
                <dt>Function</dt>
                <dd className="mono">buy(bytes32)</dd>
              </div>
              <div>
                <dt>Per action</dt>
                <dd>{formatMon(DEMO_POLICY.maxPerAction)}</dd>
              </div>
              <div>
                <dt>Per epoch</dt>
                <dd>{formatMon(DEMO_POLICY.maxPerEpoch)}</dd>
              </div>
              <div>
                <dt>Capital delegated</dt>
                <dd>{formatMon(DEMO_POLICY.balance)}</dd>
              </div>
            </dl>
            <div className="hash-block">
              <span>Policy commitment</span>
              <code>{hash}</code>
            </div>
          </aside>

          <div className="attack-panel">
            <div className="attack-nav" role="tablist" aria-label="Attack mutations">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  className={result.id === active.id ? "active" : ""}
                  onClick={() => setActiveId(result.id)}
                  onKeyDown={(event) => moveAttackFocus(event, index)}
                  role="tab"
                  id={`attack-tab-${result.id}`}
                  aria-controls={`attack-panel-${result.id}`}
                  aria-selected={result.id === active.id}
                  tabIndex={result.id === active.id ? 0 : -1}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {result.attack}
                  <b>{result.killed ? "KILLED" : "SURVIVED"}</b>
                </button>
              ))}
            </div>

            <article
              className="trace-card"
              key={`${active.id}-${runCount}`}
              role="tabpanel"
              id={`attack-panel-${active.id}`}
              aria-labelledby={`attack-tab-${active.id}`}
            >
              <div className="trace-header">
                <div>
                  <span className="danger-kicker">ATTACK MUTATION</span>
                  <h3>{active.attack}</h3>
                  <p>{active.threat}</p>
                </div>
                <div className="kill-score">
                  <span>Mutation</span>
                  <strong>{active.killed ? "KILLED" : "LIVE"}</strong>
                </div>
              </div>

              <div className="decision-compare">
                <div className="naive-decision">
                  <span>Naive guard</span>
                  <strong>{active.naive}</strong>
                  <small>Checks only per-action value</small>
                </div>
                <div className="compare-arrow" aria-hidden="true">→</div>
                <div className="hardened-decision">
                  <span>MandateExecutor</span>
                  <strong>{active.hardened}</strong>
                  <small>{active.reason}</small>
                </div>
              </div>

              <ol className="trace-list">
                {active.trace.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          </div>
        </div>
      </section>

      <section className="evidence-section shell">
        <span className="section-index">WHY MUTATION TESTING</span>
        <div className="evidence-case">
          <div className="case-heading">
            <span>SPLIT-SPEND / TWO CALLS</span>
            <code>6 MON + 6 MON / 10 MON EPOCH</code>
          </div>
          <div className="evidence-equation">
            <div>
              <span>Stateless per-action guard</span>
              <strong>6 ≤ 6 → ALLOW × 2</strong>
              <p>Both calls look safe when judged alone.</p>
            </div>
            <div className="equation-turn" aria-hidden="true">≠</div>
            <div>
              <span>MandateExecutor</span>
              <strong>6 + 6 &gt; 10 → DENY #2</strong>
              <p>Live epoch state is updated before the external call.</p>
            </div>
          </div>
          <p className="evidence-note">
            The score is reproducible because the test fixture and runtime share
            the same policy fields—not because an AI model said the call looked safe.
          </p>
        </div>
      </section>

      <section className="monad-section" id="monad">
        <div className="shell">
          <div className="section-heading light">
            <div>
              <span className="section-index">MONAD FIT</span>
              <h2>The judge stays in the loop.</h2>
            </div>
            <p>
              Fast agents create closely spaced intents. Monad lets the chain—not
              an offchain counter—own the final cumulative state.
            </p>
          </div>

          <div className="monad-numbers">
            <div>
              <strong>300ms</strong>
              <span>block frequency</span>
            </div>
            <div>
              <strong>600ms</strong>
              <span>finality</span>
            </div>
            <div>
              <strong>10,000</strong>
              <span>transactions / second</span>
            </div>
            <div>
              <strong>EVM</strong>
              <span>Solidity + existing wallets</span>
            </div>
          </div>

          <div className="adapter-table" role="table" aria-label="Monad DeFi adapter path">
            <div className="adapter-row adapter-head" role="row">
              <span role="columnheader">Monad flow</span>
              <span role="columnheader">Agent action</span>
              <span role="columnheader">Mandate boundary</span>
              <span role="columnheader">MVP coverage</span>
            </div>
            <div className="adapter-row" role="row">
              <strong role="cell">Kuru · Clober · Uniswap</strong>
              <span role="cell">Order or swap</span>
              <span role="cell">Target + selector + epoch budget</span>
              <code role="cell">GENERIC CALL CORE</code>
            </div>
            <div className="adapter-row" role="row">
              <strong role="cell">Lending · rebalancers</strong>
              <span role="cell">Supply, borrow, reposition</span>
              <span role="cell">Call boundary + delegated capital</span>
              <code role="cell">ADAPTER NEXT</code>
            </div>
            <div className="adapter-row" role="row">
              <strong role="cell">x402 · MPP</strong>
              <span role="cell">Machine payment</span>
              <span role="cell">Recipient, value, nonce, deadline</span>
              <code role="cell">NATIVE MON PATH</code>
            </div>
          </div>
        </div>
      </section>

      <section className="execution-section shell">
        <div>
          <span className="section-index">EXECUTION BOUNDARY</span>
          <h2>The API advises.<br />The contract decides.</h2>
          <p>
            Agents call <code>/api/judge-intent</code> for a deterministic trace.
            Value only moves through <code>MandateExecutor.executeIntent</code>,
            which rechecks live state atomically.
          </p>
          <ol className="authority-path">
            <li><span>01</span><strong>Reference API</strong><code>trace only</code></li>
            <li><span>02</span><strong>MandateExecutor</strong><code>atomic recheck</code></li>
            <li><span>03</span><strong>Allowed target</strong><code>value + event</code></li>
          </ol>
          <div className="assurance-boundary">
            <div>
              <span>WHAT THIS PROVES</span>
              <p>
                One committed policy kills cumulative-spend, target, selector,
                replay, and expiry mutations with stable reason codes.
              </p>
            </div>
            <div>
              <span>NOT PROVEN YET</span>
              <p>
                No audit, no live Testnet receipt, and no protocol-specific
                slippage or oracle adapter until the qualifying deploy.
              </p>
            </div>
          </div>
        </div>
        <div className="deployment-card">
          <div className="panel-topline">
            <span>Monad deployment</span>
            <span className={deploymentReady ? "live-pill" : "pending-pill"}>
              {deploymentReady ? "LIVE" : "PENDING"}
            </span>
          </div>
          <dl>
            <div>
              <dt>Network</dt>
              <dd>{monadTestnet.name}</dd>
            </div>
            <div>
              <dt>Chain ID</dt>
              <dd>{monadTestnet.id}</dd>
            </div>
            <div>
              <dt>Executor</dt>
              <dd className="mono">
                {executorAddress ? short(executorAddress) : "event-window deploy"}
              </dd>
            </div>
          </dl>
          {executorAddress ? (
            <a
              className="explorer-link"
              href={`${monadTestnet.blockExplorers.default.url}/address/${executorAddress}`}
            >
              Open on Monadscan ↗
            </a>
          ) : (
            <span className="deployment-note">
              Address will be inserted after the qualifying deployment.
            </span>
          )}
        </div>
      </section>

      <footer>
        <div className="shell footer-inner">
          <div>
            <span className="brand compact">
              <Image
                className="brand-logo"
                src="/brand/mandatelab-logo.png"
                alt=""
                width={30}
                height={30}
              />
              <span>MandateLab</span>
            </span>
            <p>Unaudited hackathon prototype. Not production custody software.</p>
          </div>
          <div className="footer-links">
            <a href="https://docs.monad.xyz/">Monad docs</a>
            <a href="https://app.monad.xyz/">Monad DeFi</a>
            <a href="https://github.com/0xEmpoleon/monad-blitz-london">Source</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
