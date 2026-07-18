// Billing types: packs, Stripe checkout and per-project entitlements

export type PackId = 'ETUDE' | 'DOSSIER' | 'PREMIUM';

export interface ProjectEntitlement {
  /** True when the project has a paid pack: full analysis unlocked */
  unlocked: boolean;
  pack: PackId | null;
  paidAt: string | null;
  /** End of the Q&A window (paidAt + 30 jours) */
  chatAccessUntil: string | null;
  /** True when the user can still ask questions to the assistant */
  chatAvailable: boolean;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

/** One line of the "Mes achats" purchase history */
export interface PurchaseHistoryItem {
  id: string;
  pack: PackId;
  packName: string;
  status: 'PAID' | 'REFUNDED';
  amountCents: number;
  currency: string;
  paidAt: string | null;
  receiptUrl: string | null;
  project: { id: string; name: string } | null;
}
