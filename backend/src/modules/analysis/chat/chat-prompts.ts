/**
 * Prompt building for the post-analysis conversational assistant.
 * The whole project/analysis context is embedded in the system prompt so the
 * per-question messages stay small (the org is TPM-limited on OpenAI).
 */

export interface ChatContext {
  projectName: string;
  projectType: string;
  city: string | null;
  postCode: string | null;
  parcelId: string | null;
  pluZone: string | null;
  pluZoneLabel: string | null;
  floodZone: string | null;
  floodZoneLevel: string | null;
  isAbfProtected: boolean;
  abfMonumentName: string | null;
  seismicZone: string | null;
  clayRisk: string | null;
  isInNoiseZone: boolean;
  noiseZone: string | null;
  noiseAirportName: string | null;
  questionnaireResponses: Record<string, unknown> | null;
  /** Full merged analysis result as stored in AnalysisResult.llmResponse */
  analysisResultJson: string | null;
  /** Extracted PLU ruleset from cache, already stringified and truncated */
  pluRulesJson: string | null;
}

/** Keep the PLU ruleset within a reasonable token budget */
export const MAX_PLU_RULES_CHARS = 12000;

export function buildChatSystemPrompt(context: ChatContext): string {
  const location = context.city
    ? `${context.city}${context.postCode ? ` (${context.postCode})` : ''}${context.parcelId ? `, parcelle ${context.parcelId}` : ''}`
    : 'Non renseignée';

  const constraints: string[] = [];
  if (context.floodZone) {
    constraints.push(
      `Zone inondable: ${context.floodZone}${context.floodZoneLevel ? ` (risque ${context.floodZoneLevel})` : ''}`,
    );
  }
  if (context.isAbfProtected) {
    constraints.push(
      `Périmètre protégé ABF${context.abfMonumentName ? ` (${context.abfMonumentName})` : ''}`,
    );
  }
  if (context.isInNoiseZone) {
    constraints.push(
      `Zone de bruit aéroport (PEB)${context.noiseZone ? ` zone ${context.noiseZone}` : ''}${context.noiseAirportName ? ` - ${context.noiseAirportName}` : ''}`,
    );
  }
  if (context.seismicZone) {
    constraints.push(`Zone sismique: ${context.seismicZone}`);
  }
  if (context.clayRisk) {
    constraints.push(`Risque argile: ${context.clayRisk}`);
  }

  return `Tu es un assistant virtuel expert en urbanisme français. Tu accompagnes un particulier qui vient de recevoir l'analyse réglementaire de son projet de travaux. Tu réponds à ses questions à propos de CE projet, de son analyse et des démarches d'urbanisme associées.

=== CONTEXTE DU PROJET ===
Nom du projet: ${context.projectName}
Type de projet: ${context.projectType}
Localisation: ${location}
Zone PLU: ${context.pluZone || 'Non déterminée'}${context.pluZoneLabel ? ` (${context.pluZoneLabel})` : ''}
Contraintes réglementaires détectées: ${constraints.length > 0 ? constraints.join(' ; ') : 'Aucune contrainte majeure détectée'}

=== RÉPONSES AU QUESTIONNAIRE (caractéristiques du projet) ===
${context.questionnaireResponses ? JSON.stringify(context.questionnaireResponses, null, 2) : 'Non disponibles'}

=== RÉSULTAT DE L'ANALYSE (autorisation, faisabilité, contraintes, documents requis, suggestions) ===
${context.analysisResultJson || 'Non disponible'}

=== RÈGLES PLU EXTRAITES DE LA ZONE ===
${context.pluRulesJson || 'Non disponibles'}

=== CONSIGNES ===
- Réponds en français, de manière claire, concise et vulgarisée (l'utilisateur n'est pas un professionnel de l'urbanisme).
- Appuie-toi en priorité sur le contexte ci-dessus (analyse, règles PLU, contraintes) et sur la réglementation nationale d'urbanisme (code de l'urbanisme, seuils DP/PC, CERFA...).
- Si une information n'est pas disponible dans le contexte et que tu n'es pas certain, dis-le honnêtement et recommande de contacter le service urbanisme de la mairie.
- Reste dans le sujet: le projet de l'utilisateur et les questions d'urbanisme associées. Si la question est hors sujet, ramène poliment la conversation au projet.
- Rappelle lorsque c'est pertinent que tes réponses sont indicatives et que seule la décision du service instructeur de la mairie fait foi.
- Formate tes réponses en texte simple, avec éventuellement des listes à puces. Pas de tableaux ni de titres markdown.`;
}
