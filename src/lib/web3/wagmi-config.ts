"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injected } from "wagmi/connectors";
import { xLayer, xLayerMainnet, xLayerTestnet } from "./xlayer-chain";

/**
 * Wagmi config for X Layer + OKX Wallet (EIP-1193).
 *
 * OKX Wallet Chrome extension exposes itself as window.ethereum AND
 * window.okxwallet. The injected() connector handles both via EIP-6963.
 * WalletConnect is included via getDefaultConfig but OKX Wallet is the
 * primary connector for this app (0 gas USDT/USDC on X Layer).
 */
export const wagmiConfig = getDefaultConfig({
  appName: process.env.NEXT_PUBLIC_OKX_WALLET_APP_NAME ?? "SocialLink",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "SOCIAL_LINK_DEV",
  chains: [xLayer, xLayerMainnet, xLayerTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  ssr: true,
});
