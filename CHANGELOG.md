# @x402/sui Changelog

## 0.1.0

### Minor Changes

- Initial implementation of x402 v2 exact payment scheme for Sui blockchain
- Sign-first model: client signs PTB with `coinWithBalance()`, facilitator verifies and broadcasts
- Parallel signature verification + dry-run simulation for low-latency verification
- Balance change validation ensures correct recipient, asset, and amount
- Support for Ed25519 and Secp256k1 signatures (zkLogin planned)
- Circle native USDC support on mainnet and testnet
- Browser-compatible: uses `toBase64` from `@mysten/sui/utils` (no Node.js `Buffer` dependency)
- Three-role architecture: client scheme, server scheme, facilitator scheme
- Optional gas sponsorship via facilitator keypair
