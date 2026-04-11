import { SingleStake } from "./types";

// DEMO MODE: ws server runs purely in-memory. Wallet & contract stubbed.
// Browser wallet connection stays on the client (UI only).

export const MIDNIGHT_CONFIG = {
  networkId: "preprod",
  nodeUrl: "",
  relayURL: "",
  indexerHttpUrl: "",
  indexerWsUrl: "",
  provingServerUrl: "",
};

export function initWalletBackground(): Promise<void> {
  return Promise.resolve();
}

export function getWalletIfReady() {
  return null;
}

export async function getWallet(): Promise<any> {
  throw new Error("demo mode: ws wallet disabled");
}

/**
 * Demo withdraw — returns payout, no on-chain transfer.
 */
export async function withdraw(
  address: string,
  stake: SingleStake,
  multiplier: number
): Promise<number> {
  const amount = stake.amount * multiplier;
  console.log(
    `[demo] withdraw ${address.slice(0, 12)}… stake=${stake.amount} x${multiplier.toFixed(2)} = ${amount.toFixed(3)}`
  );
  return amount;
}

/**
 * Demo saveToDB — no contract call.
 */
export async function saveToDB(crashAt: number): Promise<void> {
  console.log(`[demo] crashed at ${crashAt.toFixed(2)}x`);
}

export function calculateMultiplier(
  startTime: number,
  endTime: number,
  currentTime: number,
  crashAt: number
): number {
  if (currentTime < startTime) return 1.0;
  if (currentTime >= endTime) return crashAt;
  const elapsed = currentTime - startTime;
  const totalDuration = endTime - startTime;
  const progress = elapsed / totalDuration;
  return 1.0 + progress * (crashAt - 1.0);
}
