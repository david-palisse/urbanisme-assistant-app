// Define threshold rules for each project type
export interface ThresholdRule {
  projectType: string;
  fieldId: string;
  fieldLabel: string;
  thresholds: {
    value: number;
    authorizationBelow: 'NONE' | 'DP' | 'PC';
    authorizationAboveOrEqual: 'NONE' | 'DP' | 'PC';
    zoneCondition?: string; // e.g., 'U*' for urban zones
  }[];
  unit: string;
  direction: 'below' | 'above'; // below = reduce value, above = increase
}

export const URBANISME_THRESHOLDS: ThresholdRule[] = [
  // Extension rules
  {
    projectType: 'EXTENSION',
    fieldId: 'extension_surface_plancher',
    fieldLabel: 'Surface de plancher',
    thresholds: [
      {
        value: 40,
        authorizationBelow: 'DP',
        authorizationAboveOrEqual: 'PC',
        zoneCondition: 'U*', // Urban zone with PLU
      },
      {
        value: 20,
        authorizationBelow: 'DP',
        authorizationAboveOrEqual: 'PC',
        zoneCondition: 'OTHER', // A, N zones or no PLU
      },
    ],
    unit: 'm²',
    direction: 'below',
  },
  // Pool rules
  {
    projectType: 'POOL',
    fieldId: 'piscine_surface',
    fieldLabel: 'Surface du bassin',
    thresholds: [
      {
        value: 10,
        authorizationBelow: 'NONE',
        authorizationAboveOrEqual: 'DP',
      },
      {
        value: 100,
        authorizationBelow: 'DP',
        authorizationAboveOrEqual: 'PC',
      },
    ],
    unit: 'm²',
    direction: 'below',
  },
  // Shed rules
  {
    projectType: 'SHED',
    fieldId: 'abri_surface',
    fieldLabel: "Surface de l'abri",
    thresholds: [
      {
        value: 5,
        authorizationBelow: 'NONE',
        authorizationAboveOrEqual: 'DP',
      },
      {
        value: 20,
        authorizationBelow: 'DP',
        authorizationAboveOrEqual: 'PC',
      },
    ],
    unit: 'm²',
    direction: 'below',
  },
  // Fence rules
  {
    projectType: 'FENCE',
    fieldId: 'cloture_hauteur',
    fieldLabel: 'Hauteur de clôture',
    thresholds: [
      {
        value: 2,
        authorizationBelow: 'DP',
        authorizationAboveOrEqual: 'PC',
      },
    ],
    unit: 'm',
    direction: 'below',
  },
];
