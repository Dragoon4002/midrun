export interface Stake {
  address: string;
  stake: number;
  hasWithdrawn?: boolean;
  withdrawMultiplier?: number;
}

export interface ViewData {
  stakes: Stake[];
}
