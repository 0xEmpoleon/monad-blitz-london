import { network } from "hardhat";

const { ethers, networkName } = await network.connect();

async function main() {
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error("DEPLOYER_PRIVATE_KEY is required for deployment");
  }

  const market = await ethers.deployContract("DemoMarket");
  await market.waitForDeployment();

  const executor = await ethers.deployContract("MandateExecutor");
  await executor.waitForDeployment();

  const marketDeployment = market.deploymentTransaction();
  const executorDeployment = executor.deploymentTransaction();

  console.log(
    JSON.stringify(
      {
        network: networkName,
        chainId: Number((await ethers.provider.getNetwork()).chainId),
        deployedAt: new Date().toISOString(),
        contracts: {
          DemoMarket: {
            address: await market.getAddress(),
            transactionHash: marketDeployment?.hash,
          },
          MandateExecutor: {
            address: await executor.getAddress(),
            transactionHash: executorDeployment?.hash,
          },
        },
      },
      null,
      2,
    ),
  );
}

await main();
