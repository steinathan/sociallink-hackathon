# SocialLink Contracts — X Layer (BuildX AI Season)

On-chain escrow + reputation registry for SocialLink's Web3 booking flow.

Deployed to **X Layer**, OKX's zkEVM L2 built on Polygon CDK.
Chain IDs: **195** (testnet) / **196** (mainnet).
Explorer: https://www.oklink.com/x-layer

Built for the **BuildX AI Season** hackathon (`@XLayerOfficial`). Gas on X Layer
is near-zero (`gasPrice: 0` accepted), so locking member funds in escrow costs
nothing material and 0-gas USDT/USDC transfers via OKX Wallet are free.

**Quick start:**
- Deployment runbook: [`../DEPLOYMENT.md`](../DEPLOYMENT.md)
- Deploy script: `scripts/deploy-testnet.sh`
- Verify script: `scripts/verify-testnet.sh`
- OKX testnet faucet (OKB): https://web3.okx.com/xlayer/faucet
- Testnet USDC (Circle official): `0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3`

**Build from a fresh clone** (`lib/` is gitignored — submodules are not vendored):
```bash
cd contracts
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts
forge build
forge test   # 21/21 pass
```

---

## Architecture

Two contracts, both owned by a single `admin` EOA/multisig:

```
contracts/
├── src/
│   ├── Escrow.sol              USDC escrow per booking (Firestore bookingId → bytes32)
│   └── ReputationRegistry.sol  On-chain review attestations (ATTESTER_ROLE-gated)
├── test/
│   ├── Escrow.t.sol            14 tests — happy path, refund, dispute, access
│   └── ReputationRegistry.t.sol 7 tests — attest, idempotency, access
├── script/
│   └── Deploy.s.sol            forge script — deploys both, grants roles, writes deployments.json
├── abis/
│   ├── Escrow.json             ABI for client/indexer
│   └── ReputationRegistry.json ABI for client/indexer
├── lib/                        forge-std + OpenZeppelin v5.1.0 (git submodules)
├── deployments.json            { testnet: {escrow, reputation}, mainnet: {...} } — placeholder
├── foundry.toml                solc 0.8.24, optimizer (200 runs), evm shanghai
└── README.md                   this file
```

### bookingId ↔ escrowId mapping

The Firestore `bookings/{bookingId}` doc id is a string (e.g. `"kQ3x7p9..."`).
Off-chain code converts it to `bytes32` before calling the contract:

```ts
import { keccak256, stringToBytes } from "viem";

// Canonical mapping used everywhere in the Web3 tier:
const escrowId = keccak256(stringToBytes(bookingId));
```

Then `createEscrow(escrowId, ...)` and `escrows(escrowId)` are 1:1 with the
Firestore doc. The same hashing applies to `ReputationRegistry.attestReview`'s
`bookingId` parameter, so an indexer can join `Booking.escrowId` ↔ on-chain
attestations.

---

## Roles

| Contract            | Role                  | Granted To                            | Purpose                                              |
|---------------------|-----------------------|---------------------------------------|------------------------------------------------------|
| `Escrow`            | `DEFAULT_ADMIN_ROLE`  | deployer / multisig                   | Administer roles, future upgradability              |
| `Escrow`            | `AI_RESOLVER_ROLE`    | AI dispute-resolver service account   | Call `resolveDispute` to split disputed escrow       |
| `ReputationRegistry`| `DEFAULT_ADMIN_ROLE`  | deployer / multisig                   | Administer roles                                     |
| `ReputationRegistry`| `ATTESTER_ROLE`       | Backend service account               | Call `attestReview` after a booking settles          |

`DEFAULT_ADMIN_ROLE` is `0x00` — the deployer is the only admin in production.

### Escrow permissions matrix

| Action           | Member | Consultant | Anyone | ADMIN | AI_RESOLVER |
|------------------|:------:|:----------:|:------:|:-----:|:-----------:|
| `createEscrow`   | yes    | —          | —      | —     | —           |
| `fundEscrow`     | yes    | —          | —      | —     | —           |
| `release`        | yes    | —          | after `releaseAfter` | — | —           |
| `refund`         | yes    | —          | —      | —     | —           |
| `dispute`        | yes    | yes        | —      | —     | —           |
| `resolveDispute` | —      | —          | —      | —     | yes         |

### Status transitions

```
ACTIVE ──release()──▶ RELEASED  (member or anyone after releaseAfter)
ACTIVE ──refund()───▶ REFUNDED  (member only)
ACTIVE ──dispute()──▶ DISPUTED  (member or consultant)
DISPUTED ──resolveDispute()──▶ RESOLVED  (AI_RESOLVER only; splits by basis points)
```

---

## Event signatures (for Tier-3 indexer)

```
EscrowCreated(bytes32 bookingId, address member, address consultant, address token, uint256 amount, uint64 releaseAfter)
EscrowFunded(bytes32 bookingId, address member, uint256 amount)
EscrowReleased(bytes32 bookingId, address consultant, uint256 amount)
EscrowRefunded(bytes32 bookingId, address member, uint256 amount)
EscrowDisputed(bytes32 bookingId, address caller)
EscrowResolved(bytes32 bookingId, address winner, uint256 memberAmount, uint256 consultantAmount)

ReviewAttested(address reviewed, bytes32 reviewHash, bytes32 bookingId, uint8 rating, uint256 timestamp)
```

`bookingId` is `indexed` on all Escrow events and on the `bookingId` parameter
of `ReviewAttested` — the indexer should subscribe to these topics.

---

## Build & Test

```bash
forge build          # compile (solc 0.8.24, optimizer on)
forge test -vv       # 21 tests across both contracts
```

### Exporting ABIs

After `forge build`:

```bash
# Canonical JSON array from the forge artifact (preferred for client code):
jq -r '.abi' out/Escrow.sol/Escrow.json            > abis/Escrow.json
jq -r '.abi' out/ReputationRegistry.sol/ReputationRegistry.json > abis/ReputationRegistry.json
```

ABIs are committed to `abis/` so the client/indexer can import them directly
without re-running forge.

---

## Deploy

User runs this manually — do **not** deploy from CI until a funded wallet is
configured. The deployer must:

1. Set `X_LAYER_RPC_URL` (e.g. `https://testrpc.xlayer.tech/yourkey` for
   testnet or `https://rpc.xlayer.tech/yourkey` for mainnet).
2. Set `X_LAYER_PRIVATE_KEY` (deployer EOA).
3. Set `ADMIN_ADDRESS`, `AI_RESOLVER_ADDRESS`, `ATTESTER_ADDRESS` (the three
   role recipients).

```bash
forge script script/Deploy.s.sol:Deploy \
    --rpc-url "$X_LAYER_RPC_URL" \
    --broadcast \
    --private-key "$X_LAYER_PRIVATE_KEY"
```

After the script runs, `deployments.json` is updated with the new addresses
keyed by chain id (testnet/mainnet).

---

## Verify (X Layer OKLink explorer)

```bash
# Testnet
forge verify-contract <ESCROW_ADDR> src/Escrow.sol:Escrow --chain-id 195
forge verify-contract <REPUTATION_ADDR> src/ReputationRegistry.sol:ReputationRegistry --chain-id 195

# Mainnet
forge verify-contract <ESCROW_ADDR> src/Escrow.sol:Escrow --chain-id 196
forge verify-contract <REPUTATION_ADDR> src/ReputationRegistry.sol:ReputationRegistry --chain-id 196
```

If the X Layer explorer requires the standard `verify-contract` workflow,
paste the flattened source — `forge flatten src/Escrow.sol > Escrow.flat.sol`.

---

## Gas notes

X Layer accepts `gasPrice: 0`. Per-call costs on Polygon CDK are dominated by
calldata + state writes; we minimize both:

- **Escrow**: one SSTORE for the escrow struct (fits in 2 slots), one SSTORE
  for `exists`, then ERC20 `transferFrom` / `transfer` (2 SSTOREs) on the
  token contract.
- **ReputationRegistry**: two SSTOREs (count + sum) per attest; idempotency
  check adds one SLOAD but avoids double-counting.
- `block.timestamp` is used only as a timelock fallback for permissionless
  release — within the standard 15-second validator-drift window on Polygon
  CDK.

---

## Out of scope (Tier 2 / 3 will add)

- **Upgradeability**: not needed at hackathon scope. Roles can be rotated via
  AccessControl.
- **Multi-token escrow**: single ERC20 per escrow (USDC on X Layer). To swap
  tokens, deploy a fresh escrow per booking.
- **Pull-payment pattern**: refunds/releases push directly. Acceptable for
  near-zero X Layer gas.
- **Pausable**: omitted — disputes are the pause mechanism. ADMIN can
  `revokeRole(AI_RESOLVER_ROLE)` to halt dispute resolution.

---

## References

- X Layer docs: https://www.okx.com/web3/xlayer/docs
- OKLink explorer: https://www.oklink.com/x-layer
- BuildX AI Season: search `#BuildX` on X (Twitter)
- OpenZeppelin v5: https://docs.openzeppelin.com/contracts/5.x/
- Foundry book: https://book.getfoundry.sh/
