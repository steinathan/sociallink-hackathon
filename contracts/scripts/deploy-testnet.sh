#!/usr/bin/env bash
# Deploy SocialLink contracts to X Layer testnet.
# Reads vars from ../.env.local: X_LAYER_PRIVATE_KEY, ADMIN_ADDRESS,
# AI_RESOLVER_ADDRESS, ATTESTER_ADDRESS. Deploy.s.sol requires all four.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f ../.env.local ]; then
  echo "Error: .env.local not found at repo root. Copy .env.local.example first."
  exit 1
fi

# shellcheck disable=SC1091
source ../.env.local

required=(X_LAYER_PRIVATE_KEY ADMIN_ADDRESS AI_RESOLVER_ADDRESS ATTESTER_ADDRESS)
for var in "${required[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "Error: $var not set in .env.local"
    exit 1
  fi
done

RPC_URL="${X_LAYER_RPC_URL:-https://testrpc.xlayer.tech}"

echo "Deploying to $RPC_URL (chain ID 195)..."
echo "  admin:      $ADMIN_ADDRESS"
echo "  aiResolver: $AI_RESOLVER_ADDRESS"
echo "  attester:   $ATTESTER_ADDRESS"

forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$X_LAYER_PRIVATE_KEY" \
  -vvv

echo ""
echo "Done. Check contracts/deployments.json for addresses."
echo "Verify on OKLink: https://www.oklink.com/x-layer-test"
