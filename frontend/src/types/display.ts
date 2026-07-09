import { ProjectType, ProjectStatus, AuthorizationType } from './enums';

// Project type display info
export const projectTypeLabels: Record<ProjectType, string> = {
  [ProjectType.POOL]: 'Piscine',
  [ProjectType.EXTENSION]: 'Extension',
  [ProjectType.SHED]: 'Abri de jardin',
  [ProjectType.FENCE]: 'Clôture',
  [ProjectType.NEW_CONSTRUCTION]: 'Nouvelle construction',
  [ProjectType.OTHER]: 'Autre type de projet',
};

export const projectTypeIcons: Record<ProjectType, string> = {
  [ProjectType.POOL]: '🏊',
  [ProjectType.EXTENSION]: '🏠',
  [ProjectType.SHED]: '🏚️',
  [ProjectType.FENCE]: '🚧',
  [ProjectType.NEW_CONSTRUCTION]: '🏠',
  [ProjectType.OTHER]: '🏗️',
};

export const projectTypeDescriptions: Record<ProjectType, string> = {
  [ProjectType.POOL]: 'Piscine enterrée, semi-enterrée ou hors-sol',
  [ProjectType.EXTENSION]: 'Agrandissement, surélévation ou véranda',
  [ProjectType.SHED]: 'Abri de jardin, local technique ou annexe',
  [ProjectType.FENCE]: 'Clôture, portail ou mur de clôture',
  [ProjectType.NEW_CONSTRUCTION]: 'Construction d\'une maison individuelle ou d\'un bâtiment neuf',
  [ProjectType.OTHER]: 'Terrasse, carport, panneaux solaires ou tout autre projet',
};

export const statusLabels: Record<ProjectStatus, string> = {
  [ProjectStatus.DRAFT]: 'Brouillon',
  [ProjectStatus.QUESTIONNAIRE]: 'Questionnaire en cours',
  [ProjectStatus.ANALYZING]: 'Analyse en cours',
  [ProjectStatus.COMPLETED]: 'Terminé',
};

export const statusColors: Record<ProjectStatus, string> = {
  [ProjectStatus.DRAFT]: 'bg-gray-100 text-gray-700',
  [ProjectStatus.QUESTIONNAIRE]: 'bg-blue-100 text-blue-700',
  [ProjectStatus.ANALYZING]: 'bg-yellow-100 text-yellow-700',
  [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-700',
};

export const authorizationTypeLabels: Record<AuthorizationType, string> = {
  [AuthorizationType.NONE]: 'Aucune autorisation requise',
  [AuthorizationType.DP]: 'Déclaration Préalable (DP)',
  [AuthorizationType.PC]: 'Permis de Construire (PC)',
  [AuthorizationType.PA]: "Permis d'Aménager (PA)",
};

export const authorizationTypeColors: Record<AuthorizationType, string> = {
  [AuthorizationType.NONE]: 'bg-green-100 text-green-700 border-green-200',
  [AuthorizationType.DP]: 'bg-orange-100 text-orange-700 border-orange-200',
  [AuthorizationType.PC]: 'bg-red-100 text-red-700 border-red-200',
  [AuthorizationType.PA]: 'bg-red-100 text-red-700 border-red-200',
};

export const documentCategoryLabels: Record<string, string> = {
  formulaires: 'Formulaires administratifs',
  plans: 'Plans et documents graphiques',
  photos: 'Photographies',
  notices: 'Notices descriptives',
  attestations: 'Attestations réglementaires',
  autres: 'Autres documents',
};
