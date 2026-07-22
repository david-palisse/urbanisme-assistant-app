import { PackId } from '@/types';

// Display data for the packs. Prices shown here are informative: the amount
// actually charged is defined server-side (backend/src/modules/billing/packs.ts).
export interface PackPromoDisplay {
  price: number; // euros, discounted
  /** Promo stops applying at this date (exclusive) */
  endsAt: Date;
}

export interface PackDisplay {
  id: PackId;
  name: string;
  price: number; // euros
  /** Time-boxed discount; keep in sync with backend/src/modules/billing/packs.ts */
  promo?: PackPromoDisplay;
  tagline: string;
  features: string[];
  available: boolean;
  highlighted: boolean;
}

export const PACKS: PackDisplay[] = [
  {
    id: 'ETUDE',
    name: 'Pack Étude',
    price: 39,
    // Launch promo: -50% for 6 months to celebrate the site opening.
    promo: {
      price: 19.5,
      endsAt: new Date('2027-01-01T00:00:00.000Z'),
    },
    tagline: 'Toute votre analyse, sans limite',
    features: [
      'Analyse complète de faisabilité',
      "Conditions et points d'attention détaillés",
      "Suggestions d'optimisation du projet",
      'Liste des documents à fournir et CERFA',
      "Questions illimitées à l'assistant pendant 30 jours",
    ],
    available: true,
    highlighted: true,
  },
  {
    id: 'DOSSIER',
    name: 'Pack Dossier',
    price: 149,
    tagline: 'Votre dossier prêt à déposer',
    features: [
      'Tout le Pack Étude',
      'CERFA prérempli',
      'Plan de situation généré',
      'Plan de masse généré',
      'Insertion graphique du projet',
    ],
    available: false,
    highlighted: false,
  },
  {
    id: 'PREMIUM',
    name: 'Pack Premium',
    price: 349,
    tagline: 'Accompagnement de bout en bout',
    features: [
      'Tout le Pack Dossier',
      'Relecture / vérification humaine du dossier avant dépôt',
      'Accompagnement en cas de demande de pièces complémentaires',
    ],
    available: false,
    highlighted: false,
  },
];

export const PRO_CONTACT_EMAIL = 'contact@mon-urba.fr';

export function getActivePromo(pack: PackDisplay): PackPromoDisplay | null {
  if (!pack.promo || new Date() >= pack.promo.endsAt) {
    return null;
  }
  return pack.promo;
}

export function formatPromoEndDate(date: Date): string {
  // Fixed to the Paris timezone regardless of where the page renders, so a
  // date meant as "January 1st" doesn't shift to Dec 31 on a US server.
  const timeZone = 'Europe/Paris';
  const day = Number(
    date.toLocaleDateString('fr-FR', { day: 'numeric', timeZone })
  );
  // toLocaleDateString gives "1 janvier"; French grammar wants "1er janvier"
  const dayLabel = day === 1 ? '1er' : String(day);
  const monthYear = date.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone,
  });
  return `${dayLabel} ${monthYear}`;
}
