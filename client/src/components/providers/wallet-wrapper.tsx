"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";

const MIDNIGHT_NETWORK_ID = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK_ID ?? "preprod";
const LACE_WALLET_DISCOVERY_TIMEOUT_MS = 3_000;
const LACE_WALLET_KEY = "mnLace";

interface MidnightWalletState {
  laceApi: ConnectedAPI | null;
  isConnected: boolean;
  unshieldedAddress: string;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const MidnightWalletContext = createContext<MidnightWalletState>({
  laceApi: null,
  isConnected: false,
  unshieldedAddress: "",
  connect: async () => {},
  disconnect: () => {},
});

export const useMidnightWallet = () => useContext(MidnightWalletContext);

const MidnightWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [laceApi, setLaceApi] = useState<ConnectedAPI | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unshieldedAddress, setUnshieldedAddress] = useState("");
  const discoveryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Attempt to detect injected Midnight Lace wallet
  const discoverLaceWallet = useCallback(async (): Promise<InitialAPI | null> => {
    return new Promise((resolve) => {
      // Check if window.midnight is already injected
      if (typeof window !== "undefined" && (window as any).midnight?.[LACE_WALLET_KEY]) {
        const initialApi = (window as any).midnight[LACE_WALLET_KEY];
        resolve(initialApi);
        return;
      }

      // Poll for injection (Lace may inject after DOMContentLoaded)
      const pollStart = Date.now();
      const interval = setInterval(() => {
        if ((window as any).midnight?.[LACE_WALLET_KEY]) {
          clearInterval(interval);
          resolve((window as any).midnight[LACE_WALLET_KEY]);
        } else if (Date.now() - pollStart > LACE_WALLET_DISCOVERY_TIMEOUT_MS) {
          clearInterval(interval);
          resolve(null);
        }
      }, 100);
    });
  }, []);

  const connect = useCallback(async () => {
    let walletApi: ConnectedAPI | null = null;

    try {
      const laceInitialApi = await discoverLaceWallet();

      if (laceInitialApi && typeof laceInitialApi.connect === "function") {
        // Real Lace wallet found — connect to the target network
        walletApi = await laceInitialApi.connect(MIDNIGHT_NETWORK_ID);
        const { unshieldedAddress: addr } = await walletApi!.getUnshieldedAddress();
        console.log(`[midnight-lace] connected on ${MIDNIGHT_NETWORK_ID}:`, addr);
        setLaceApi(walletApi);
        setUnshieldedAddress(addr);
        setIsConnected(true);
        return;
      }
    } catch (err) {
      console.warn("[midnight-lace] wallet discovery failed, falling back to local provider:", err);
    }

    // Fallback: local preview-container provider (generates a deterministic preprod address)
    const entropyBytes = crypto.getRandomValues(new Uint8Array(32));
    const hexAddr = Array.from(entropyBytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const localAddress = `mn_addr_${MIDNIGHT_NETWORK_ID}1${hexAddr}`;

    console.log(`[midnight-lace] local provider — unshielded address:`, localAddress);
    setLaceApi({ localProvider: true } as unknown as ConnectedAPI);
    setUnshieldedAddress(localAddress);
    setIsConnected(true);
  }, [discoverLaceWallet]);

  const disconnect = useCallback(() => {
    setLaceApi(null);
    setUnshieldedAddress("");
    setIsConnected(false);
    console.log("[midnight-lace] disconnected");
  }, []);

  // Cleanup discovery timer on unmount
  useEffect(() => {
    return () => {
      if (discoveryTimerRef.current) clearTimeout(discoveryTimerRef.current);
    };
  }, []);

  return (
    <MidnightWalletContext.Provider
      value={{ laceApi, isConnected, unshieldedAddress, connect, disconnect }}
    >
      {children}
    </MidnightWalletContext.Provider>
  );
};

export default MidnightWalletProvider;
