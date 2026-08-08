# Sign in with OKX Wallet — SIWE (EIP-4361) on X Layer

Sign-in path for the BuildX AI Season on **X Layer** (chain id `195`,
Polygon CDK zkEVM, `@XLayerOfficial`). Runs **parallel** to the existing
phone-OTP and Google sign-in flows — same `__session` cookie shape, same
middleware gate, same dashboard redirect.

## Flow

```
Browser                                   Server                          Firestore
─────────                                  ──────                          ──────────
1. user clicks "Continue with OKX Wallet"
2. /login/wallet page mounts
   <Web3Provider> wraps wagmi + RainbowKit
3. user clicks Connect
   └─ wagmi injected() picks up window.ethereum
      (OKX Wallet Chrome extension) ─────
5. POST /api/auth/wallet-nonce
   { address }                            ──► getWalletNonce(addr)
                                              validates /0x40hex/
                                              writes auth_wallet_nonces/{addr}
                                              { nonce, issuedAt, expiresAt=+10m }
                                              ──► { nonce, issuedAt, expiresAt } ──
6. SiweMessage.build({ domain, address,
   statement, uri, version:"1",
   chainId:195, nonce, issuedAt })
7. signMessageAsync({ message })
   └─ wallet prompts user
8. POST signInWithWallet server action
   { address, message, signature }        ──► verifyWalletSignature
                                              ─ SiweMessage.verify()
                                              ─ checks nonce exists, not expired
                                              ─ checks chainId == 195
                                              ─ lowercases for comparison
                                              ─ DELETES nonce doc (single-use)
                                              ─ adminDb.runTransaction upsert
                                                users/{uid} (uid = lower addr)
                                              ─ adminAuth.createCustomToken(uid)
                                              ─ returns customToken
   ◄─ { success, customToken, isNewUser } ─
9. client: signInWithCustomToken(auth, ct)
10. client: createSessionCookie(idToken)
    ── /api/auth/verify-session passes ──► middleware lets /dashboard in
11. router.replace(/onboarding | /dashboard)
```

## Security

- **Nonce TTL**: 10 minutes (`WALLET_NONCE_TTL_SECONDS`). Server checks
  `now > expiresAt` before verifying.
- **Single-use**: the `auth_wallet_nonces/{address}` doc is **deleted**
  inside `verifyWalletSignature` after a successful verify. Replay fails
  with "Nonce not found."
- **Address normalization**: every comparison goes through `.toLowerCase()`,
  including the Firebase Auth uid (`uid = address.toLowerCase()`).
- **Chain binding**: `SiweMessage.chainId === 195`. A signature produced
  against chain 1 (Ethereum mainnet) or chain 8453 (Base) is rejected with
  "Wrong chain."
- **Firestore rules**: `auth_wallet_nonces/{address}` is `allow read,
  write: if false;` — clients cannot read or write nonces directly. Only
  Server Actions with admin credentials touch it.
- **No gas**: EIP-4361 `personal_sign` is free; users do not need OKB to
  sign in.

## Files

- `src/actions/auth-wallet.actions.ts` — server-side:
  `getWalletNonce`, `verifyWalletSignature`, `signInWithWallet`,
  `linkWalletToExistingAccount`.
- `src/app/api/auth/wallet-nonce/route.ts` — `POST { address }` → issues
  nonce.
- `src/app/(auth)/login/wallet/page.tsx` — server component, wraps the
  client form in `Web3Provider`.
- `src/app/(auth)/login/wallet/_components/ConnectWalletInline.tsx` —
  RainbowKit inline button, wagmi signing, error handling, redirect.

## Linking a wallet to an existing phone/Google user

`linkWalletToExistingAccount({ idToken, address })` is the additive path
that lets an authenticated user bind their wallet to their existing
account. It is not invoked from the login flow; it lives in
`auth-wallet.actions.ts` for `/profile` or onboarding to call later.

## Hackathon notes

- BuildX AI Season on X Layer — `@XLayerOfficial`
- X Layer testnet chain id = 195; mainnet = 196
- OKX Wallet Chrome extension exposes `window.ethereum` AND
  `window.okxwallet`; the wagmi `injected()` connector handles both via
  EIP-6963.