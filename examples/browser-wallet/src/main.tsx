/**
 * x402/sui — Browser Wallet Example (Dual-Chain: Sui + EVM)
 *
 * Provider setup for both Sui (dapp-kit) and EVM (wagmi) wallets.
 * Demonstrates the x402 payment flow working in a real browser
 * with wallet popups for transaction signing.
 *
 * COINBASE PR NOTE: For the monorepo, this pattern shows how to integrate
 * @x402/sui alongside @x402/evm in a browser-based dApp. See COINBASE-PR.md.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import "@mysten/dapp-kit/dist/index.css";
import App from "./App";

// ─── Sui Configuration ──────────────────────────────────────────────────────

const suiNetworks = {
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

// ─── EVM Configuration ──────────────────────────────────────────────────────

const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(),
  },
});

// ─── Providers ───────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <SuiClientProvider networks={suiNetworks} defaultNetwork="testnet">
          <WalletProvider autoConnect>
            <App />
          </WalletProvider>
        </SuiClientProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
