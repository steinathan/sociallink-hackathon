#!/usr/bin/env bash
# Verify deployed contracts on X Layer testnet (OKLink).
# Reads deployed addresses from contracts/deployments.json and prints the
# OKLink explorer URLs. forge verify-contract is attempted but OKLink does
# not run an Etherscan-style verifier, so visual check is the source of truth.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f deployments.json ]; then
  echo "Error: contracts/deployments.json not found. Deploy first."
  exit 1
fi

# shellcheck disable=SC1091
source ../.env.local 2>/dev/null || true
RPC_URL="${X_LAYER_RPC_URL:-https://testrpc.xlayer.tech}"

ZERO="0x0000000000000000000000000000000000000000"
ESCROW=$(jq -r '.testnet.escrow // empty' deployments.json)
REPUTATION=$(jq -r '.testnet.reputation // empty' deployments.json)

if [ -z "$ESCROW" ] || [ "$ESCROW" = "$ZERO" ]; then
  echo "Error: testnet Escrow address not set in deployments.json"
  exit 1
fi

echo "Escrow:             https://www.oklink.com/x-layer-test/address/$ESCROW"
echo "ReputationRegistry: https://www.oklink.com/x-layer-test/address/$REPUTATION"
echo ""

# Best-effort automated verification. OKLink does not implement Etherscan's
# verifier API, so this is expected to fail — keep going.
forge verify-contract "$ESCROW" src/Escrow.sol:Escrow \
  --chain-id 195 \
  --rpc-url "$RPC_URL" \
  --watch 2>/dev/null \
  && echo "Escrow verified." \
  || echo "(forge verify-contract not supported on OKLink — verify visually)"

forge verify-contract "$REPUTATION" src/ReputationRegistry.sol:ReputationRegistry \
  --chain-id 195 \
  --rpc-url "$RPC_URL" \
  --watch 2>/dev/null \
  && echo "ReputationRegistry verified." \
  || true

echo ""
echo "Manual verification checklist:"
echo "  [ ] Contract code at each address matches contracts/src/*.sol"
echo "  [ ] Deployer is your funded wallet (X_LAYER_PRIVATE_KEY)"
echo "  [ ] Escrow has DEFAULT_ADMIN_ROLE granted to ADMIN_ADDRESS"
echo "  [ ] Escrow has AI_RESOLVER_ROLE granted to AI_RESOLVER_ADDRESS"
echo "  [ ] ReputationRegistry has ATTESTER_ROLE granted to ATTESTER_ADDRESS"
