import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10_143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MONAD_RPC_URL ??
          "https://testnet-rpc.monad.xyz",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Monadscan",
      url: "https://testnet.monadscan.com",
    },
  },
  testnet: true,
});

export const executorAddress = process.env
  .NEXT_PUBLIC_MANDATE_EXECUTOR_ADDRESS as `0x${string}` | undefined;

export const demoMarketAddress = process.env
  .NEXT_PUBLIC_DEMO_MARKET_ADDRESS as `0x${string}` | undefined;

export const deploymentReady = Boolean(executorAddress && demoMarketAddress);
