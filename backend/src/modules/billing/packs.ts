import { Pack } from '@prisma/client';

/** Number of days the post-analysis Q&A stays open after payment */
export const CHAT_ACCESS_DAYS = 30;

/** Number of words of the analysis summary shown for free */
export const FREE_SUMMARY_WORDS = 30;

export interface PackPromo {
  /** Discounted price applied while the promo is active */
  amountCents: number;
  /** Promo stops applying at this date (exclusive) */
  endsAt: Date;
}

export interface PackDefinition {
  name: string;
  description: string;
  amountCents: number;
  /** Only available packs can be purchased; others are "bientôt disponible" */
  available: boolean;
  /** Time-boxed discount; absent outside promo periods */
  promo?: PackPromo;
}

/**
 * Single source of truth for pack pricing on the backend. Prices are given
 * to Stripe inline (price_data) so no product configuration is required in
 * the Stripe dashboard.
 */
export const PACK_DEFINITIONS: Record<Pack, PackDefinition> = {
  [Pack.ETUDE]: {
    name: 'Pack Étude',
    description:
      "Analyse complète de faisabilité, conditions, optimisations, liste des documents et CERFA, questions illimitées à l'assistant pendant 30 jours.",
    amountCents: 3900,
    available: true,
    // Launch promo: -50% for 6 months to celebrate the site opening.
    promo: {
      amountCents: 1950,
      endsAt: new Date('2027-01-01T00:00:00.000Z'),
    },
  },
  [Pack.DOSSIER]: {
    name: 'Pack Dossier',
    description:
      'Tout le Pack Étude + CERFA prérempli + génération des plans (situation, masse, insertion graphique).',
    amountCents: 14900,
    available: false,
  },
  [Pack.PREMIUM]: {
    name: 'Pack Premium',
    description:
      'Tout le Pack Dossier + relecture / vérification humaine du dossier avant dépôt + accompagnement en cas de demande de pièces complémentaires.',
    amountCents: 34900,
    available: false,
  },
};

/** Effective price of a pack right now: the promo price while it's active, the regular price otherwise */
export function getPackPriceCents(pack: Pack): number {
  const definition = PACK_DEFINITIONS[pack];
  if (definition.promo && new Date() < definition.promo.endsAt) {
    return definition.promo.amountCents;
  }
  return definition.amountCents;
}
