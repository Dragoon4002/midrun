"use client";

import { addressCompress } from "@/helpers/common";
import { cn } from "@/lib/utils";
import { useMidnightWallet } from "../providers/wallet-wrapper";
import { useGame } from "@/contexts/GameContext";
import { User } from "lucide-react";

const UsersView = () => {
  const { address: activeAddress } = useMidnightWallet();
  const { stakes, totalPlayers, totalStakeAmount, phase } = useGame();

  const getStatus = (item: (typeof stakes)[number]) => {
    if (item.hasWithdrawn) {
      const payout = item.withdrawMultiplier
        ? item.stake * item.withdrawMultiplier
        : item.stake;
      return { label: `Withdrawn: ${payout.toFixed(3)}`, color: "text-green-500" };
    }
    if (phase === "ended") {
      return { label: `Game end, lost: ${item.stake}`, color: "text-red-500" };
    }
    return { label: `Bet placed: ${item.stake}`, color: "text-muted-foreground" };
  };

  return (
    <div className="mt-6 w-full">
      {/* User Header */}
      <div className="flex items-center w-full justify-between">
        {/* No. of Users */}
        <div className="flex space-x-2 items-center text-muted-foreground">
          <User />
          <p className="text-sm font-semibold">{totalPlayers} Players</p>
        </div>

        {/* Total Coins Staked */}
        <div className="text-md font-semibold text-muted-foreground flex items-center">
          {totalStakeAmount.toFixed(3)}
        </div>
      </div>
      {/* Users */}
      <div className="w-full mt-4 space-y-4 pb-4">
        {stakes.map((item, idx) => (
          <div
            key={idx}
            className={cn(
              "p-4 bg-card rounded-xl",
              item.address === activeAddress && "border-primary border-2"
            )}
          >
            <div className="flex items-center border-primary justify-between">
              <p className="text-md">
                {addressCompress(item.address.toString())}
              </p>
              <div
                className={cn(
                  "text-md font-semibold flex items-center",
                  getStatus(item).color
                )}
              >
                {getStatus(item).label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersView;
