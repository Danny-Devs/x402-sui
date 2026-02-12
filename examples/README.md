# @x402/sui Examples

Runnable examples demonstrating the x402 payment protocol on Sui.

## Quick Start

Run all three components to see the full payment flow:

```bash
# Terminal 1 — Start the facilitator (verifies + settles payments)
cd facilitator
cp .env.example .env
pnpm install && pnpm start

# Terminal 2 — Start the API server (sells weather data for $0.001)
cd server-hono
cp .env.example .env   # Set SUI_PAY_TO_ADDRESS
pnpm install && pnpm start

# Terminal 3 — Run the paying client
cd client-fetch
cp .env.example .env   # Set SUI_PRIVATE_KEY (funded with testnet USDC)
pnpm install && pnpm start
```

## Examples

| Example | Description | Port |
|---------|-------------|------|
| **[client-fetch](./client-fetch/)** | Fetch wrapper that auto-handles 402 payments | — |
| **[server-hono](./server-hono/)** | Hono API server gated behind x402 payments | 4021 |
| **[facilitator](./facilitator/)** | Standalone payment verification + settlement service | 4022 |
| **[browser-wallet](./browser-wallet/)** | Dual-chain browser dApp (Sui dapp-kit + EVM wagmi) | 5173 |

## Architecture

```
┌──────────────┐     GET /weather     ┌──────────────┐
│              │ ──────────────────▶  │              │
│  client-fetch│                      │  server-hono │
│              │ ◀── 402 + requirements│              │
│  (signs PTB) │                      │  (Hono app)  │
│              │                      │              │
│              │  retry + PAYMENT-SIG │              │
│              │ ──────────────────▶  │              │
│              │                      │    ┌─────────┤
│              │                      │    │ verify  │──▶ ┌──────────────┐
│              │                      │    │ settle  │    │  facilitator  │
│              │ ◀── 200 + data       │    └─────────┤    │              │
│              │                      │              │◀── │  (dry-run +  │
└──────────────┘                      └──────────────┘    │   broadcast) │
                                                          └──────────────┘
```

## Testnet Setup

1. **Generate a keypair:**
   ```bash
   npx @mysten/sui keytool generate ed25519
   ```

2. **Fund with SUI** (for gas): https://faucet.sui.io

3. **Fund with testnet USDC**: https://faucet.circle.com

4. Copy the private key to `client-fetch/.env`

## Network

All examples default to `sui:testnet`. Set `SUI_NETWORK=sui:mainnet` for production (and fund with real USDC).
