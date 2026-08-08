"use client";

import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { xLayerMainnet, xLayerTestnet } from "./xlayer-chain";

/**
 * Wagmi config for X Layer + OKX Wallet (EIP-1193).
 *
 * OKX Wallet Chrome extension exposes itself as window.ethereum AND
 * window.okxwallet. The injected() connector handles both via EIP-6963.
 *
 * Uses wagmi's createConfig (not RainbowKit's getDefaultConfig) so we can
 * explicitly register only the injected connector — RainbowKit's modal will
 * surface OKX Wallet as the primary "Detected" injected wallet.
 *
 * Both X Layer testnet (195) and mainnet (196) are registered so users can
 * switch via their wallet; the active chain is selected by NEXT_PUBLIC_X_LAYER_CHAIN_ID
 * (defaults to testnet for the hackathon).
 */
export const wagmiConfig = createConfig({
  chains: [xLayerTestnet, xLayerMainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [xLayerTestnet.id]: http(),
    [xLayerMainnet.id]: http(),
  },
  ssr: true,
});
