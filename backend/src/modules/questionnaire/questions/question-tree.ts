import { ProjectType } from '@prisma/client';

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'multiselect';
  options?: { value: string; label: string }[];
  required: boolean;
  helpText?: string;
  unit?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  dependsOn?: {
    questionId: string;
    value: string | boolean | number;
  };
}

export interface QuestionGroup {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

// Common questions shared across project types
const commonLocationQuestions: Question[] = [
  {
    id: 'distance_limite_separative',
    text: 'À quelle distance de la limite séparative (voisins) sera situé votre projet ?',
    type: 'number',
    required: true,
    unit: 'mètres',
    helpText: 'Distance minimale entre votre construction et la limite de propriété',
    validation: { min: 0, max: 100 },
  },
  {
    id: 'distance_voie_publique',
    text: 'À quelle distance de la voie publique sera situé votre projet ?',
    type: 'number',
    required: true,
    unit: 'mètres',
    helpText: 'Distance par rapport à la rue ou voie publique',
    validation: { min: 0, max: 200 },
  },
  {
    id: 'position_terrain',
    text: 'Où sera situé votre projet sur le terrain ?',
    type: 'select',
    required: true,
    options: [
      { value: 'avant', label: 'Devant la maison (côté rue)' },
      { value: 'arriere', label: 'Derrière la maison (jardin)' },
      { value: 'lateral', label: 'Sur le côté de la maison' },
    ],
  },
];

// Pool-specific questions
const poolQuestions: QuestionGroup[] = [
  {
    id: 'pool_type',
    title: 'Type de piscine',
    description: 'Informations générales sur votre piscine',
    questions: [
      {
        id: 'piscine_type',
        text: 'Quel type de piscine souhaitez-vous installer ?',
        type: 'select',
        required: true,
        options: [
          { value: 'enterree', label: 'Piscine enterrée' },
          { value: 'semi_enterree', label: 'Piscine semi-enterrée' },
          { value: 'hors_sol', label: 'Piscine hors-sol (> 3 mois/an)' },
        ],
      },
      {
        id: 'piscine_surface',
        text: 'Quelle sera la surface du bassin ?',
        type: 'number',
        required: true,
        unit: 'm²',
        helpText: 'Surface du bassin uniquement (sans les plages)',
        validation: { min: 1, max: 500 },
      },
      {
        id: 'piscine_profondeur',
        text: 'Quelle sera la profondeur maximale ?',
        type: 'number',
        required: true,
        unit: 'mètres',
        validation: { min: 0.5, max: 3 },
      },
    ],
  },
  {
    id: 'pool_cover',
    title: 'Couverture et abri',
    description: 'Informations sur la couverture de la piscine',
    questions: [
      {
        id: 'piscine_abri',
        text: 'Prévoyez-vous un abri ou une couverture ?',
        type: 'select',
        required: true,
        options: [
          { value: 'aucun', label: 'Non, piscine découverte' },
          { value: 'couverture_basse', label: 'Couverture basse (< 1.8m)' },
          { value: 'abri_haut', label: 'Abri haut (≥ 1.8m)' },
        ],
      },
      {
        id: 'abri_hauteur',
        text: 'Quelle sera la hauteur de l\'abri ?',
        type: 'number',
        required: true,
        unit: 'mètres',
        validation: { min: 0.5, max: 6 },
        dependsOn: {
          questionId: 'piscine_abri',
          value: 'abri_haut',
        },
      },
      {
        id: 'abri_surface',
        text: 'Quelle sera la surface couverte par l\'abri ?',
        type: 'number',
        required: true,
        unit: 'm²',
        validation: { min: 1, max: 500 },
        dependsOn: {
          questionId: 'piscine_abri',
          value: 'abri_haut',
        },
      },
    ],
  },
  {
    id: 'pool_location',
    title: 'Emplacement',
    description: 'Localisation de la piscine sur votre terrain',
    questions: commonLocationQuestions,
  },
];

// Extension-specific questions
const extensionQuestions: QuestionGroup[] = [
  {
    id: 'extension_type',
    title: 'Type d\'extension',
    description: 'Caractéristiques de votre extension',
    questions: [
      {
        id: 'extension_type',
        text: 'Quel type d\'extension souhaitez-vous réaliser ?',
        type: 'select',
        required: true,
        options: [
          { value: 'horizontale', label: 'Extension horizontale (plain-pied)' },
          { value: 'surelevation', label: 'Surélévation (ajout d\'étage)' },
          { value: 'veranda', label: 'Véranda' },
        ],
      },
      {
        id: 'extension_usage',
        text: 'Quelle sera l\'usage de cette extension ?',
        type: 'select',
        required: true,
        options: [
          { value: 'habitation', label: 'Habitation (chambre, salon, etc.)' },
          { value: 'garage', label: 'Garage' },
          { value: 'bureau', label: 'Bureau / Atelier' },
          { value: 'autre', label: 'Autre' },
        ],
      },
    ],
  },
  {
    id: 'extension_dimensions',
    title: 'Dimensions',
    description: 'Dimensions de votre extension',
    questions: [
      {
        id: 'extension_surface_plancher',
        text: 'Quelle sera la surface de plancher créée ?',
        type: 'number',
        required: true,
        unit: 'm²',
        helpText: 'Surface de plancher = surface intérieure, hauteur sous plafond > 1.80m',
        validation: { min: 1, max: 500 },
      },
      {
        id: 'extension_emprise_sol',
        text: 'Quelle sera l\'emprise au sol ?',
        type: 'number',
        required: true,
        unit: 'm²',
        helpText: 'Emprise au sol = projection verticale du bâtiment',
        validation: { min: 1, max: 500 },
      },
      {
        id: 'extension_hauteur',
        text: 'Quelle sera la hauteur maximale ?',
        type: 'number',
        required: true,
        unit: 'mètres',
        helpText: 'Hauteur mesurée depuis le sol naturel jusqu\'au point le plus haut',
        validation: { min: 1, max: 15 },
      },
    ],
  },
  {
    id: 'extension_existing',
    title: 'Existant',
    description: 'Informations sur la construction existante',
    questions: [
      {
        id: 'surface_existante',
        text: 'Quelle est la surface de plancher existante de votre maison ?',
        type: 'number',
        required: true,
        unit: 'm²',
        helpText: 'Surface totale actuelle de votre habitation',
        validation: { min: 1, max: 1000 },
      },
    ],
  },
  {
    id: 'extension_location',
    title: 'Emplacement',
    description: 'Localisation de l\'extension',
    questions: commonLocationQuestions,
  },
];

// Shed-specific questions
const shedQuestions: QuestionGroup[] = [
  {
    id: 'shed_type',
    title: 'Type d\'abri',
    description: 'Caractéristiques de votre abri de jardin',
    questions: [
      {
        id: 'abri_type',
        text: 'Quel type d\'abri souhaitez-vous installer ?',
        type: 'select',
        required: true,
        options: [
          { value: 'bois', label: 'Abri en bois' },
          { value: 'metal', label: 'Abri métallique' },
          { value: 'pvc', label: 'Abri en PVC/résine' },
          { value: 'maconnerie', label: 'Construction en maçonnerie' },
        ],
      },
      {
        id: 'abri_usage',
        text: 'Quelle sera l\'utilisation de cet abri ?',
        type: 'select',
        required: true,
        options: [
          { value: 'rangement', label: 'Rangement (outils, mobilier)' },
          { value: 'atelier', label: 'Atelier' },
          { value: 'local_technique', label: 'Local technique (piscine, etc.)' },
          { value: 'autre', label: 'Autre' },
        ],
      },
    ],
  },
  {
    id: 'shed_dimensions',
    title: 'Dimensions',
    description: 'Dimensions de votre abri',
    questions: [
      {
        id: 'abri_surface',
        text: 'Quelle sera la surface au sol de l\'abri ?',
        type: 'number',
        required: true,
        unit: 'm²',
        helpText: 'Surface d\'emprise au sol',
        validation: { min: 1, max: 50 },
      },
      {
        id: 'abri_hauteur',
        text: 'Quelle sera la hauteur de l\'abri ?',
        type: 'number',
        required: true,
        unit: 'mètres',
        helpText: 'Hauteur au point le plus haut (faîtage)',
        validation: { min: 1, max: 6 },
      },
    ],
  },
  {
    id: 'shed_location',
    title: 'Emplacement',
    description: 'Localisation de l\'abri sur votre terrain',
    questions: commonLocationQuestions,
  },
];

// Fence-specific questions
const fenceQuestions: QuestionGroup[] = [
  {
    id: 'fence_type',
    title: 'Type de clôture',
    description: 'Caractéristiques de votre clôture',
    questions: [
      {
        id: 'cloture_type',
        text: 'Quel type de clôture souhaitez-vous installer ?',
        type: 'select',
        required: true,
        options: [
          { value: 'grillage', label: 'Grillage' },
          { value: 'palissade_bois', label: 'Palissade en bois' },
          { value: 'mur', label: 'Mur / Muret' },
          { value: 'haie', label: 'Haie végétale' },
          { value: 'mixte', label: 'Mixte (mur + grillage, etc.)' },
        ],
      },
      {
        id: 'cloture_emplacement',
        text: 'Où sera située cette clôture ?',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'rue', label: 'En bordure de rue' },
          { value: 'voisins', label: 'En limite avec les voisins' },
          { value: 'fond', label: 'En fond de terrain' },
        ],
      },
    ],
  },
  {
    id: 'fence_dimensions',
    title: 'Dimensions',
    description: 'Dimensions de votre clôture',
    questions: [
      {
        id: 'cloture_hauteur',
        text: 'Quelle sera la hauteur de la clôture ?',
        type: 'number',
        required: true,
        unit: 'mètres',
        helpText: 'Hauteur totale y compris soubassement',
        validation: { min: 0.5, max: 4 },
      },
      {
        id: 'cloture_longueur',
        text: 'Quelle sera la longueur totale de la clôture ?',
        type: 'number',
        required: true,
        unit: 'mètres',
        validation: { min: 1, max: 500 },
      },
    ],
  },
  {
    id: 'fence_features',
    title: 'Caractéristiques supplémentaires',
    description: 'Éléments additionnels',
    questions: [
      {
        id: 'portail',
        text: 'Prévoyez-vous l\'installation d\'un portail ?',
        type: 'boolean',
        required: true,
      },
      {
        id: 'portail_largeur',
        text: 'Quelle sera la largeur du portail ?',
        type: 'number',
        required: true,
        unit: 'mètres',
        validation: { min: 0.5, max: 6 },
        dependsOn: {
          questionId: 'portail',
          value: true,
        },
      },
      {
        id: 'portail_hauteur',
        text: 'Quelle sera la hauteur du portail ?',
        type: 'number',
        required: true,
        unit: 'mètres',
        validation: { min: 0.5, max: 4 },
        dependsOn: {
          questionId: 'portail',
          value: true,
        },
      },
    ],
  },
];

// New Construction-specific questions
const newConstructionQuestions: QuestionGroup[] = [
  {
    id: 'new_construction_purpose',
    title: 'Destination de la construction',
    description: 'Informations sur l\'usage prévu de votre nouvelle construction',
    questions: [
      {
        id: 'construction_purpose',
        text: 'Quelle est la destination de cette construction ?',
        type: 'select',
        required: true,
        options: [
          { value: 'residence_principale', label: 'Résidence principale' },
          { value: 'residence_secondaire', label: 'Résidence secondaire' },
          { value: 'locatif', label: 'Investissement locatif' },
        ],
      },
      {
        id: 'is_in_subdivision',
        text: 'Le terrain est-il situé dans un lotissement ?',
        type: 'boolean',
        required: true,
        helpText: 'Un lotissement est un terrain divisé en lots destinés à être bâtis',
      },
    ],
  },
  {
    id: 'new_construction_dimensions',
    title: 'Dimensions du projet',
    description: 'Caractéristiques dimensionnelles de votre construction',
    questions: [
      {
        id: 'construction_floors',
        text: 'Combien d\'étages aura la construction (hors sous-sol) ?',
        type: 'select',
        required: true,
        options: [
          { value: '1', label: 'Plain-pied (1 niveau)' },
          { value: '2', label: 'R+1 (2 niveaux)' },
          { value: '3', label: 'R+2 (3 niveaux)' },
          { value: '4', label: 'R+3 ou plus' },
        ],
      },
      {
        id: 'construction_total_surface',
        text: 'Quelle sera la surface de plancher totale ?',
        type: 'number',
        required: true,
        unit: 'm²',
        helpText: 'Surface de plancher = somme des surfaces de chaque niveau, mesurée au nu intérieur des murs',
        validation: { min: 20, max: 2000 },
      },
      {
        id: 'construction_emprise_sol',
        text: 'Quelle sera l\'emprise au sol ?',
        type: 'number',
        required: true,
        unit: 'm²',
        helpText: 'Projection verticale au sol de la construction (incluant terrasses, porches, etc.)',
        validation: { min: 20, max: 1000 },
      },
      {
        id: 'construction_height',
        text: 'Quelle sera la hauteur maximale de la construction ?',
        type: 'number',
        required: true,
        unit: 'mètres',
        helpText: 'Hauteur mesurée depuis le sol naturel jusqu\'au faîtage',
        validation: { min: 3, max: 20 },
      },
    ],
  },
  {
    id: 'new_construction_materials',
    title: 'Matériaux et aspect extérieur',
    description: 'Aspect extérieur de votre construction',
    questions: [
      {
        id: 'exterior_materials',
        text: 'Quels matériaux principaux seront utilisés pour les façades ?',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'enduit', label: 'Enduit (crépi)' },
          { value: 'pierre', label: 'Pierre' },
          { value: 'brique', label: 'Brique' },
          { value: 'bois', label: 'Bardage bois' },
          { value: 'metal', label: 'Bardage métallique' },
          { value: 'mixte', label: 'Mixte / Autre' },
        ],
      },
      {
        id: 'roof_type',
        text: 'Quel type de toiture est prévu ?',
        type: 'select',
        required: true,
        options: [
          { value: 'tuiles', label: 'Toiture en tuiles' },
          { value: 'ardoise', label: 'Toiture en ardoise' },
          { value: 'zinc', label: 'Toiture zinc/métal' },
          { value: 'toit_plat', label: 'Toit-terrasse (plat)' },
          { value: 'vegetalise', label: 'Toiture végétalisée' },
        ],
      },
    ],
  },
  {
    id: 'new_construction_location',
    title: 'Emplacement',
    description: 'Localisation de la construction sur votre terrain',
    questions: commonLocationQuestions,
  },
];

// Question tree by project type
export const questionTreeByType: Record<ProjectType, QuestionGroup[]> = {
  POOL: poolQuestions,
  EXTENSION: extensionQuestions,
  SHED: shedQuestions,
  FENCE: fenceQuestions,
  NEW_CONSTRUCTION: newConstructionQuestions,
};

// Export helper function to get questions
export function getQuestionsForProjectType(projectType: ProjectType): QuestionGroup[] {
  return questionTreeByType[projectType] || [];
}
