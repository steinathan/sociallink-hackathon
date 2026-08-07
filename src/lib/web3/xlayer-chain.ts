import { defineChain } from "viem";

// X Layer (OKX zkEVM, Polygon CDK)
// https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/about-xlayer

export const xLayerTestnet = defineChain({
  id: 195,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testrpc.xlayer.tech"] },
    public: { http: ["https://testrpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: {
      name: "OKLink Testnet",
      url: "https://www.oklink.com/x-layer-test",
    },
  },
  testnet: true,
});

export const xLayerMainnet = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.xlayer.tech"] },
    public: { http: ["https://rpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/x-layer" },
  },
  testnet: false,
});

/**
 * Active chain based on env. Defaults to testnet for safety during the hackathon.
 * Per hackathon rules: deploy testnet during, mainnet after.
 */
export const xLayer =
  process.env.NEXT_PUBLIC_X_LAYER_CHAIN_ID === "196"
    ? xLayerMainnet
    : xLayerTestnet;

export const XLAYER_USDC_DECIMALS = 6; // USDC is 6 decimals
export const XLAYER_OKB_DECIMALS = 18;

/** Build an OKLink tx link for a given hash. */
export function oklinkTxUrl(hash: `0x${string}`, testnet = true) {
  const base = testnet ? "https://www.oklink.com/x-layer-test" : "https://www.oklayer.com/x-layer".replace("oklayer", "oklink");
  return `${base}/tx/${hash}`;
}

/** Build an OKLink address link. */
export function oklinkAddressUrl(address: `0x${string}`, testnet = true) {
  const base = testnet ? "https://www.oklink.com/x-layer-test" : "https://www.oklink.com/x-layer";
  return `${base}/address/${address}`;
}
