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

/**
 * Budget for the PLU ruleset embedded in the system prompt (~10k tokens). The
 * ruleset is the chat's only source for local rules, so it must not be cut
 * short: a 12k budget used to drop the exceptions and land-use entries that
 * users ask about most.
 */
export const MAX_PLU_RULES_CHARS = 40000;

function stripQuotes(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripQuotes);
  if (!node || typeof node !== 'object') return node;
  return Object.fromEntries(
    Object.entries(node as Record<string, unknown>)
      .filter(([key]) => key !== 'quote')
      .map(([key, value]) => [key, stripQuotes(value)]),
  );
}

/**
 * Serialize the cached PLU ruleset for the prompt. Whole ruleset first; when it
 * exceeds the budget, drop the verbatim `quote` fields (bulky, redundant with
 * the rule text) before ever truncating, so no rule is lost.
 */
export function serializePluRules(
  rules: unknown,
  maxChars: number = MAX_PLU_RULES_CHARS,
): string {
  const full = JSON.stringify(rules);
  if (full.length <= maxChars) return full;

  const compact = JSON.stringify(stripQuotes(rules));
  if (compact.length <= maxChars) return compact;

  return `${compact.slice(0, maxChars)}... (tronqué)`;
}

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

=== RÈGLES PLU EXTRAITES DE LA ZONE (règlement écrit du PLU, JSON) ===
Structure: "rules" (règles générales par thème: implantation, hauteur, emprise, reculs, stationnement, espaces verts, aspect...), "landUse" (destinations et travaux autorisés, interdits ou sous conditions, ex: réhabilitation, changement de destination), "exceptions" (dérogations propres à un type de projet), "constructibleBands" (bandes constructibles), "warnings" (points non vérifiés). Les champs "source" indiquent l'article du règlement et "quote" la phrase d'origine.
${context.pluRulesJson || 'Non disponibles'}

=== CONSIGNES ===
- Réponds en français, de manière claire, concise et vulgarisée (l'utilisateur n'est pas un professionnel de l'urbanisme).
- Pour toute question sur une règle locale (implantation, hauteur, emprise, stationnement, destinations autorisées, aspect...), cherche d'abord la réponse dans les règles PLU ci-dessus (règle générale, puis "exceptions" et "landUse" qui priment sur elles), cite la valeur exacte et son article ("source") quand il est indiqué, puis applique-la au projet de l'utilisateur. N'affirme jamais qu'une règle locale n'existe pas sans l'avoir cherchée dans tout le JSON.
- Si les règles PLU sont "Non disponibles" ou si un point est absent ou listé dans "warnings", dis-le clairement, donne la règle nationale applicable et invite l'utilisateur à vérifier le règlement de la zone ou à contacter la mairie.
- Appuie-toi en priorité sur le contexte ci-dessus (analyse, règles PLU, contraintes) et sur la réglementation nationale d'urbanisme (code de l'urbanisme, seuils DP/PC, CERFA...).
- Si une information n'est pas disponible dans le contexte et que tu n'es pas certain, dis-le honnêtement et recommande de contacter le service urbanisme de la mairie.
- Reste dans le sujet: le projet de l'utilisateur et les questions d'urbanisme associées. Si la question est hors sujet, ramène poliment la conversation au projet.
- Rappelle lorsque c'est pertinent que tes réponses sont indicatives et que seule la décision du service instructeur de la mairie fait foi.
- Formate tes réponses en texte simple, avec éventuellement des listes à puces. Pas de tableaux ni de titres markdown.`;
}
