import { PackId } from '@/types';

// Display data for the packs. Prices shown here are informative: the amount
// actually charged is defined server-side (backend/src/modules/billing/packs.ts).
export interface PackDisplay {
  id: PackId;
  name: string;
  price: number; // euros
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
