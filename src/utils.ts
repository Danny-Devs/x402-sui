import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import type { Network } from "@x402/core/types";
import {
  SUI_MAINNET_CAIP2,
  SUI_TESTNET_CAIP2,
  SUI_DEVNET_CAIP2,
  USDC_MAINNET,
  USDC_TESTNET,
  SUI_ADDRESS_REGEX,
} from "./constants";

/**
 * Create a SuiClient for the specified network
 *
 * @param network - CAIP-2 network identifier (e.g., "sui:mainnet")
 * @param customRpcUrl - Optional custom RPC URL override
 * @returns SuiClient configured for the specified network
 */
export function createSuiClient(network: Network, customRpcUrl?: string): SuiClient {
  if (customRpcUrl) {
    return new SuiClient({ url: customRpcUrl });
  }

  switch (network) {
    case SUI_MAINNET_CAIP2:
      return new SuiClient({ url: getFullnodeUrl("mainnet") });
    case SUI_TESTNET_CAIP2:
      return new SuiClient({ url: getFullnodeUrl("testnet") });
    case SUI_DEVNET_CAIP2:
      return new SuiClient({ url: getFullnodeUrl("devnet") });
    default:
      throw new Error(`Unsupported Sui network: ${network}`);
  }
}

/**
 * Get the default USDC coin type for a network
 *
 * @param network - CAIP-2 network identifier
 * @returns USDC coin type string
 */
export function getUsdcCoinType(network: Network): string {
  switch (network) {
    case SUI_MAINNET_CAIP2:
      return USDC_MAINNET;
    case SUI_TESTNET_CAIP2:
      return USDC_TESTNET;
    case SUI_DEVNET_CAIP2:
      return USDC_TESTNET;
    default:
      throw new Error(`No USDC coin type configured for network: ${network}`);
  }
}

/**
 * Validate a fully zero-padded Sui address format (0x + 64 hex chars).
 * Short-form addresses like "0x2" must be normalized to full-length first.
 *
 * @param address - Hex-encoded Sui address (0x + 64 hex chars)
 * @returns true if address matches the full-length format
 */
export function validateSuiAddress(address: string): boolean {
  return SUI_ADDRESS_REGEX.test(address);
}

/**
 * Convert a decimal amount string to token smallest units
 *
 * @param decimalAmount - The decimal amount (e.g., "0.10")
 * @param decimals - The number of decimals for the token (e.g., 6 for USDC)
 * @returns The amount in smallest units as a string
 */
export function convertToTokenAmount(decimalAmount: string, decimals: number): string {
  const trimmed = decimalAmount.trim();
  if (trimmed.startsWith("-")) {
    throw new Error(`Negative amounts not allowed: ${decimalAmount}`);
  }
  const amount = parseFloat(trimmed);
  if (isNaN(amount)) {
    throw new Error(`Invalid amount: ${decimalAmount}`);
  }
  // Convert to smallest unit (e.g., for USDC with 6 decimals: 0.10 * 10^6 = 100000)
  // Use toFixed to avoid scientific notation (e.g., 1e-7) from String()
  const [intPart, decPart = ""] = amount.toFixed(decimals).split(".");
  const paddedDec = decPart.padEnd(decimals, "0").slice(0, decimals);
  const tokenAmount = (intPart + paddedDec).replace(/^0+/, "") || "0";
  return tokenAmount;
}

/**
 * Compare two Sui coin types for equality after normalization
 * Handles differences in leading zeros, casing, and formatting
 *
 * @param a - First coin type
 * @param b - Second coin type
 * @returns true if the coin types are equivalent
 */
export function coinTypesEqual(a: string, b: string): boolean {
  return normalizeStructTag(a) === normalizeStructTag(b);
}
