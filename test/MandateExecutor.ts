import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("MandateExecutor", function () {
  async function deployFixture() {
    const [principal, agent, outsider] = await ethers.getSigners();
    const executor = await ethers.deployContract("MandateExecutor");
    const market = await ethers.deployContract("DemoMarket");
    await executor.waitForDeployment();
    await market.waitForDeployment();

    const latest = await ethers.provider.getBlock("latest");
    const selector = market.interface.getFunction("buy").selector;

    await executor.connect(principal).createPolicy({
      agent: agent.address,
      target: await market.getAddress(),
      selector,
      maxPerAction: ethers.parseEther("6"),
      maxPerEpoch: ethers.parseEther("10"),
      epochSeconds: 3_600,
      validUntil: BigInt(latest!.timestamp + 86_400),
    });

    await executor
      .connect(principal)
      .deposit(1n, { value: ethers.parseEther("20") });

    const assetId = ethers.id("MON-USD");
    const data = market.interface.encodeFunctionData("buy", [assetId]);

    const intent = (value: string, nonce: bigint) => ({
      target: market.getAddress(),
      value: ethers.parseEther(value),
      data,
      nonce,
      deadline: BigInt(latest!.timestamp + 3_600),
    });

    return { principal, agent, outsider, executor, market, intent, data, latest };
  }

  it("executes an allowed action and emits a bound receipt", async function () {
    const { agent, executor, market, intent } = await deployFixture();
    const safeIntent = await intent("4", 1n);

    await expect(executor.connect(agent).executeIntent(1n, safeIntent))
      .to.emit(executor, "IntentExecuted")
      .withArgs(
        1n,
        await executor.intentHash(1n, safeIntent),
        1n,
        await market.getAddress(),
        market.interface.getFunction("buy").selector,
        ethers.parseEther("4"),
        await executor.currentEpoch(1n),
        ethers.parseEther("4"),
      );

    expect(await executor.policyBalances(1n)).to.equal(
      ethers.parseEther("16"),
    );
  });

  it("atomically blocks the second half of a split-spend attack", async function () {
    const { agent, executor, intent } = await deployFixture();
    await executor.connect(agent).executeIntent(1n, await intent("6", 10n));

    const second = await intent("6", 11n);
    const preview = await executor.previewIntent(1n, second, agent.address);
    expect(preview.verdict).to.equal(1n);
    expect(preview.reason).to.equal(9n);

    await expect(
      executor.connect(agent).executeIntent(1n, second),
    ).to.be.revertedWithCustomError(executor, "IntentDenied").withArgs(9n);
  });

  it("rejects target and selector substitution", async function () {
    const { agent, outsider, executor, market, intent, latest } =
      await deployFixture();

    const wrongTarget = {
      ...(await intent("1", 20n)),
      target: outsider.address,
    };
    expect(
      (await executor.previewIntent(1n, wrongTarget, agent.address)).reason,
    ).to.equal(6n);

    const wrongSelector = {
      target: await market.getAddress(),
      value: ethers.parseEther("1"),
      data: "0xdeadbeef",
      nonce: 21n,
      deadline: BigInt(latest!.timestamp + 3_600),
    };
    expect(
      (await executor.previewIntent(1n, wrongSelector, agent.address)).reason,
    ).to.equal(7n);
  });

  it("rejects replay and expired intents", async function () {
    const { agent, executor, intent } = await deployFixture();
    const replayed = await intent("1", 30n);
    await executor.connect(agent).executeIntent(1n, replayed);

    await expect(
      executor.connect(agent).executeIntent(1n, replayed),
    ).to.be.revertedWithCustomError(executor, "IntentDenied").withArgs(10n);

    const expired = { ...(await intent("1", 31n)), deadline: 1n };
    expect(
      (await executor.previewIntent(1n, expired, agent.address)).reason,
    ).to.equal(4n);
  });

  it("rolls back nonce, spend, and balance when the target fails", async function () {
    const [principal, agent] = await ethers.getSigners();
    const executor = await ethers.deployContract("MandateExecutor");
    const market = await ethers.deployContract("FailingMarket");
    const latest = await ethers.provider.getBlock("latest");
    const selector = market.interface.getFunction("buy").selector;

    await executor.createPolicy({
      agent: agent.address,
      target: await market.getAddress(),
      selector,
      maxPerAction: ethers.parseEther("6"),
      maxPerEpoch: ethers.parseEther("10"),
      epochSeconds: 3_600,
      validUntil: BigInt(latest!.timestamp + 3_600),
    });
    await executor.deposit(1n, { value: ethers.parseEther("10") });

    const failedIntent = {
      target: await market.getAddress(),
      value: ethers.parseEther("2"),
      data: market.interface.encodeFunctionData("buy", [ethers.id("FAIL")]),
      nonce: 40n,
      deadline: BigInt(latest!.timestamp + 1_000),
    };

    await expect(
      executor.connect(agent).executeIntent(1n, failedIntent),
    ).to.be.revertedWithCustomError(executor, "ExternalCallFailed");

    expect(await executor.usedNonces(1n, 40n)).to.equal(false);
    expect(await executor.policyBalances(1n)).to.equal(
      ethers.parseEther("10"),
    );
    const epoch = await executor.currentEpoch(1n);
    expect(await executor.epochSpend(1n, epoch)).to.equal(0n);
    expect(principal.address).to.not.equal(agent.address);
  });
});
