// Client-side wallet balance surfaced in the HUD (the bag footer).
//
// The connected wallet's $WOC balance is external (read from a Solana RPC by
// src/net/wallet) and is NOT world state, so it doesn't belong on IWorld. To
// keep src/ui free of any src/net import, main.ts (the one layer that knows
// both) pushes the value in here, and the HUD reads it out. A single listener
// lets the bag re-render when the value changes. The balance may be an
// unverified connected-wallet preview, so callers that make public claims must
// check the verified flag or read verifiedWocBalance().
let enabled = false;
let balance: number | null = null;
let verified = false;
let displayAvailable = false;
let listener: (() => void) | null = null;

/** Whether the wallet feature is enabled in this client build. */
export function walletUiEnabled(): boolean {
  return enabled;
}

/** The connected wallet's $WOC balance, or null when no wallet is connected. */
export function wocBalance(): number | null {
  return balance;
}

/** Whether the current balance belongs to the account-linked wallet. */
export function wocBalanceVerified(): boolean {
  return balance !== null && verified;
}

/** The verified account-linked wallet balance, or null when unlinked. */
export function verifiedWocBalance(): number | null {
  return wocBalanceVerified() ? balance : null;
}

/** Whether any wallet is connected in this browser or linked to the account. */
export function walletDisplayAvailable(): boolean {
  return displayAvailable;
}

export function setWalletUiEnabled(value: boolean): void {
  if (enabled === value) return;
  enabled = value;
  listener?.();
}

export function setWocBalance(value: number | null, isVerified = false): void {
  const nextVerified = value !== null && isVerified;
  if (balance === value && verified === nextVerified) return;
  balance = value;
  verified = nextVerified;
  listener?.();
}

export function setWalletDisplayAvailable(value: boolean): void {
  if (displayAvailable === value) return;
  displayAvailable = value;
  listener?.();
}

/** Register the HUD's re-render hook (one consumer: the bag). */
export function onWalletUiChange(cb: () => void): void {
  listener = cb;
}
