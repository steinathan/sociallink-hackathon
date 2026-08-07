# SocialLink — Testnet Deployment Guide
BuildX AI Season Hackathon · X Layer (OKX zkEVM) · Aug 21 23:59 UTC

## Prerequisites
- Funded OKB wallet on X Layer testnet (chain ID 195). Faucet: https://web3.okx.com/xlayer/faucet
- Node.js 20+, npm
- Foundry (forge, cast) — install: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- A small amount of testnet USDC for funding escrows (optional, ~10 USDC).
  Testnet USDC: `0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3` (Circle official).
  Fund via OKX Wallet's in-app swap/faucet, or transfer from another testnet user.

## Step 1 — Install deps
```bash
cd bolt_hookup && npm install
cd functions && npm install && cd ..
```

## Step 2 — Configure `.env.local`
Copy `.env.local.example` to `.env.local` and fill in:

```bash
X_LAYER_PRIVATE_KEY=<your funded testnet wallet's private key>
ADMIN_ADDRESS=<public address of the X_LAYER_PRIVATE_KEY wallet>
ATTESTER_ADDRESS=<public address of a service account that writes reviews>
AI_RESOLVER_ADDRESS=<public address of AI_RESOLVER_PRIVATE_KEY — MUST differ from X_LAYER_PRIVATE_KEY>
AI_RESOLVER_PRIVATE_KEY=<second wallet for the AI dispute mediator to sign with>
USDC_X_LAYER_ADDRESS=0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3
ESCROW_CONTRACT_ADDRESS=<leave blank — Deploy script writes this>
ANTHROPIC_API_KEY=<from console.anthropic.com>
```

## Step 3 — Deploy contracts
```bash
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testrpc.xlayer.tech \
  --broadcast \
  --private-key $X_LAYER_PRIVATE_KEY \
  -vvv
```

Or use the wrapper: `bash scripts/deploy-testnet.sh`.

## Step 4 — Verify on OKLink
After deployment, copy the contract addresses from the broadcast output.
Open in OKLink:
- `https://www.oklink.com/x-layer-test/address/<Escrow address>`
- `https://www.oklink.com/x-layer-test/address/<ReputationRegistry address>`

Confirm the deployed bytecode matches `contracts/src/`. OKLink does not run the
Etherscan-style verifier, so verification is visual — confirm the contract
name and source match.

## Step 5 — Update `.env.local`
Add the deployed addresses:

```bash
ESCROW_CONTRACT_ADDRESS=<from step 4>
REPUTATION_CONTRACT_ADDRESS=<from step 4>
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=$ESCROW_CONTRACT_ADDRESS
NEXT_PUBLIC_REPUTATION_CONTRACT_ADDRESS=$REPUTATION_CONTRACT_ADDRESS
NEXT_PUBLIC_USDC_X_LAYER_ADDRESS=0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3
```

Restart `npm run dev` to pick up new env values.

## Step 6 — Smoke-test the full flow
1. `npm run dev` → open http://localhost:3000
2. Sign in with OKX Wallet (SIWE)
3. Switch to X Layer testnet in OKX Wallet
4. Get testnet USDC from the OKX Wallet faucet
5. Browse to a consultant profile, request a booking
6. Verify on OKLink that `Escrow.createEscrow` was called with your bookingId
7. Approve the booking; verify escrow status moves to `ACTIVE`
8. Mark booking complete; verify `Escrow.release` fires
9. (Optional) Trigger a dispute; verify AI dispute mediator runs and signs EIP-712

## Step 7 — Re-grant AI resolver role (only if you change the AI wallet)
The Deploy script grants `AI_RESOLVER_ROLE` to `AI_RESOLVER_ADDRESS` at deploy
time. If you rotate that wallet later, re-grant with:

```bash
cast send <Escrow address> "grantRole(bytes32,address)" \
  $(cast keccak "AI_RESOLVER_ROLE") \
  <AI_RESOLVER_ADDRESS> \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $X_LAYER_PRIVATE_KEY
```

## Troubleshooting
- **`InvalidChain` from OKX Wallet** — chain ID mismatch. Confirm
  `NEXT_PUBLIC_X_LAYER_CHAIN_ID=195` in `.env.local` and the wallet is on
  X Layer Testnet.
- **Deploy reverts on `vm.envAddress`** — `.env.local` is missing
  `ADMIN_ADDRESS`, `AI_RESOLVER_ADDRESS`, or `ATTESTER_ADDRESS`. Fill them
  in (see Step 2).
- **USDC transfer fails** — the user must `approve` the Escrow contract for
  the booking amount before `fundEscrow` can pull. The frontend does this
  automatically; if testing via `cast`, call `approve` first.
- **Low OKB balance** — fund the deployer at https://web3.okx.com/xlayer/faucet
  (one claim per 24h per wallet).
