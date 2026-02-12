/**
 * x402/sui — Browser Wallet Example (Dual-Chain)
 *
 * Demonstrates x402 payments from a browser using real wallet extensions.
 * Supports both Sui wallets (via dapp-kit) and EVM wallets (via wagmi).
 *
 * Flow:
 *   1. User connects a Sui wallet, EVM wallet, or both
 *   2. User clicks "Fetch Weather" to call the protected API
 *   3. Server returns 402 with payment requirements
 *   4. x402 client auto-signs a payment transaction (wallet popup)
 *   5. Request retries with payment → server returns data
 */
import { useState, useCallback } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignTransaction,
} from "@mysten/dapp-kit";
import { useAccount, useConnect, useDisconnect, useWalletClient } from "wagmi";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactSuiScheme } from "@x402/sui/exact/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import type { ClientSuiSigner } from "@x402/sui";

// ─── Configuration ───────────────────────────────────────────────────────────

const RESOURCE_URL = import.meta.env.VITE_RESOURCE_URL || "http://localhost:4021";
const ENDPOINT = import.meta.env.VITE_ENDPOINT || "/weather";

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Sui wallet state (via dapp-kit)
  const suiAccount = useCurrentAccount();
  const { mutateAsync: signSuiTransaction } = useSignTransaction();

  // EVM wallet state (via wagmi)
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: evmWalletClient } = useWalletClient();

  // ─── Payment Handler ────────────────────────────────────────────────────

  const handleFetch = useCallback(async () => {
    if (!suiAccount && !evmConnected) {
      setResult("Connect a wallet first (Sui or EVM).");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      // Build x402 client with connected wallet(s)
      const client = new x402Client();

      // Register Sui scheme if Sui wallet is connected
      if (suiAccount) {
        const suiSigner: ClientSuiSigner = {
          address: suiAccount.address,
          signTransaction: async (tx) => {
            const { bytes, signature } = await signSuiTransaction({
              transaction: tx,
            });
            return { signature, bytes };
          },
        };
        registerExactSuiScheme(client, { signer: suiSigner });
      }

      // Register EVM scheme if EVM wallet is connected
      if (evmWalletClient) {
        registerExactEvmScheme(client, { signer: evmWalletClient });
      }

      // Wrap fetch with automatic 402 payment handling
      const paidFetch = wrapFetchWithPayment(fetch, client);

      // Make the paid request
      const response = await paidFetch(`${RESOURCE_URL}${ENDPOINT}`);

      if (response.ok) {
        const data = await response.json();
        setResult(JSON.stringify(data, null, 2));
      } else if (response.status === 402) {
        setResult("Payment required but no compatible wallet connected for this network.");
      } else {
        const text = await response.text();
        setResult(`Error ${response.status}: ${text}`);
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [suiAccount, evmConnected, evmWalletClient, signSuiTransaction]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>x402 Browser Wallet Demo</h1>
      <p style={styles.subtitle}>
        Dual-chain payments: Sui + EVM (Base Sepolia)
      </p>

      {/* Wallet Connection */}
      <div style={styles.wallets}>
        <div style={styles.walletCard}>
          <h3>Sui Wallet</h3>
          <ConnectButton />
          {suiAccount && (
            <p style={styles.address}>
              {suiAccount.address.slice(0, 10)}...{suiAccount.address.slice(-6)}
            </p>
          )}
        </div>

        <div style={styles.walletCard}>
          <h3>EVM Wallet</h3>
          {evmConnected ? (
            <>
              <button onClick={() => disconnect()} style={styles.button}>
                Disconnect
              </button>
              <p style={styles.address}>
                {evmAddress?.slice(0, 10)}...{evmAddress?.slice(-4)}
              </p>
            </>
          ) : (
            connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => connect({ connector })}
                style={styles.button}
              >
                Connect {connector.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Payment Action */}
      <div style={styles.action}>
        <button
          onClick={handleFetch}
          disabled={loading || (!suiAccount && !evmConnected)}
          style={{
            ...styles.fetchButton,
            opacity: loading || (!suiAccount && !evmConnected) ? 0.5 : 1,
          }}
        >
          {loading ? "Signing payment..." : `Fetch ${ENDPOINT} ($0.001 USDC)`}
        </button>
        <p style={styles.hint}>
          Target: {RESOURCE_URL}{ENDPOINT}
        </p>
      </div>

      {/* Result */}
      {result && (
        <pre style={styles.result}>{result}</pre>
      )}

      {/* How It Works */}
      <div style={styles.howItWorks}>
        <h3>How it works</h3>
        <ol>
          <li>Connect a Sui or EVM wallet above</li>
          <li>Click &ldquo;Fetch&rdquo; — the server returns HTTP 402</li>
          <li>x402 auto-signs a payment transaction (wallet popup)</li>
          <li>Request retries with payment proof → server returns data</li>
        </ol>
        <p>
          <strong>Sui:</strong> Signs a PTB with <code>coinWithBalance()</code> via dapp-kit
          <br />
          <strong>EVM:</strong> Signs an EIP-3009 or Permit2 authorization via wagmi
        </p>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 700,
    margin: "40px auto",
    padding: "0 20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#e0e0e0",
    backgroundColor: "#1a1a2e",
    minHeight: "100vh",
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 4,
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 32,
  },
  wallets: {
    display: "flex",
    gap: 16,
    marginBottom: 32,
  },
  walletCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#16213e",
    border: "1px solid #333",
  },
  address: {
    fontSize: 12,
    color: "#4fc3f7",
    marginTop: 8,
    fontFamily: "monospace",
  },
  button: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #555",
    backgroundColor: "#0f3460",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  action: {
    textAlign: "center" as const,
    marginBottom: 24,
  },
  fetchButton: {
    padding: "14px 32px",
    borderRadius: 12,
    border: "none",
    backgroundColor: "#e94560",
    color: "#fff",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontFamily: "monospace",
  },
  result: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#0a0a1a",
    border: "1px solid #333",
    fontSize: 13,
    fontFamily: "monospace",
    whiteSpace: "pre-wrap" as const,
    overflow: "auto",
    maxHeight: 300,
    color: "#4fc3f7",
  },
  howItWorks: {
    marginTop: 32,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#16213e",
    border: "1px solid #333",
    fontSize: 14,
    lineHeight: 1.6,
  },
};
