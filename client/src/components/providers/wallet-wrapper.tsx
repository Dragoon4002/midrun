"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// DEMO MODE: real Midnight Lace connection replaced with mock address.
// Original wallet discovery code preserved in git history.

interface MidnightWalletState {
  connectedApi: any | null;
  isConnected: boolean;
  address: string;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const MidnightWalletContext = createContext<MidnightWalletState>({
  connectedApi: null,
  isConnected: false,
  address: "",
  connect: async () => {},
  disconnect: () => {},
});

export const useMidnightWallet = () => useContext(MidnightWalletContext);

const MidnightWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [connectedApi, setConnectedApi] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState("");

  const connect = useCallback(async () => {
    // DEMO MODE: generate a mock preprod address instantly.
    // Bypasses Midnight Lace extension for video demos.
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const mockAddress = `mn_addr_preprod1demo${randomHex}`;

    console.log("[wallet] demo mode — mock address:", mockAddress);
    setConnectedApi({ demo: true });
    setAddress(mockAddress);
    setIsConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    setConnectedApi(null);
    setAddress("");
    setIsConnected(false);
  }, []);

  return (
    <MidnightWalletContext.Provider value={{ connectedApi, isConnected, address, connect, disconnect }}>
      {children}
    </MidnightWalletContext.Provider>
  );
};

export default MidnightWalletProvider;
