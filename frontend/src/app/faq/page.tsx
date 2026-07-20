import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const metadata: Metadata = {
  title: 'FAQ | mon-urba',
  description:
    "Questions fréquentes sur mon-urba : autorisations d'urbanisme (DP, permis de construire), analyse de faisabilité, packs, paiement et compte.",
};

interface FaqEntry {
  question: string;
  answer: string;
}

interface FaqSection {
  title: string;
  entries: FaqEntry[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: 'Général',
    entries: [
      {
        question: "Qu'est-ce que MonUrba ?",
        answer:
          "MonUrba est une application d'aide aux démarches d'urbanisme pour les particuliers. À partir de l'adresse (ou de la parcelle) de votre terrain et d'un questionnaire sur votre projet (piscine, extension, abri de jardin, clôture, construction neuve...), elle identifie les règles d'urbanisme applicables, détermine le type d'autorisation nécessaire et liste les documents à fournir.",
      },
      {
        question: "D'où viennent les informations affichées ?",
        answer:
          "Des sources publiques officielles : le Géoportail de l'urbanisme (PLU et zonages), le cadastre, la Base Adresse Nationale et Géorisques (zones inondables, sismicité, radon, argiles...). L'analyse de votre projet est ensuite produite automatiquement à partir du règlement écrit de la zone de votre terrain.",
      },
      {
        question: 'Les résultats sont-ils fiables ?',
        answer:
          "Les informations sont fournies à titre indicatif et ne constituent pas un conseil juridique. Elles vous donnent une lecture solide des règles applicables, mais seule la décision du service instructeur de votre mairie fait foi. Nous vous recommandons de confirmer la faisabilité de votre projet auprès du service urbanisme de votre commune avant de déposer votre dossier.",
      },
      {
        question: 'Ma commune est-elle couverte ?',
        answer:
          "MonUrba couvre les communes de France dont le document d'urbanisme (PLU, PLUi...) est publié sur le Géoportail de l'urbanisme, ce qui représente la grande majorité des communes. Si le règlement de votre zone n'est pas disponible, l'analyse vous l'indiquera clairement.",
      },
    ],
  },
  {
    title: "Autorisations d'urbanisme",
    entries: [
      {
        question:
          'Quelle est la différence entre une Déclaration Préalable (DP) et un Permis de Construire (PC) ?',
        answer:
          "La Déclaration Préalable concerne les travaux de faible importance : petites surfaces (en général entre 5 et 20 m², parfois 40 m² en zone urbaine), clôtures, modifications de façade, piscines de taille modérée. Le Permis de Construire s'applique aux projets plus importants : grandes surfaces, constructions nouvelles, changements de destination. L'analyse de votre projet vous indique laquelle s'applique à votre cas.",
      },
      {
        question: 'Mon abri de jardin ou ma piscine nécessite-t-il une autorisation ?',
        answer:
          "Cela dépend de la surface, de la hauteur, de l'implantation et de la zone de votre terrain (et de protections éventuelles comme les abords de monuments historiques). C'est précisément ce que l'analyse MonUrba détermine pour votre projet : aucune formalité, DP ou permis de construire.",
      },
      {
        question: "Qu'est-ce qu'une zone ABF / abords de monument historique ?",
        answer:
          "Si votre terrain est dans le périmètre de protection d'un monument historique, l'Architecte des Bâtiments de France (ABF) doit donner son avis sur votre projet. Les délais d'instruction sont allongés et les prescriptions architecturales plus strictes. La fiche terrain MonUrba vous signale immédiatement si vous êtes concerné.",
      },
      {
        question: "Quels sont les délais d'instruction ?",
        answer:
          "En règle générale : 1 mois pour une Déclaration Préalable et 2 mois pour un permis de construire d'une maison individuelle (3 mois pour les autres permis). Ces délais peuvent être majorés dans certains cas, notamment en zone ABF. Le délai court à partir du dépôt d'un dossier complet en mairie.",
      },
    ],
  },
  {
    title: 'Mon analyse',
    entries: [
      {
        question: "Qu'est-ce qui est gratuit et qu'est-ce qui est payant ?",
        answer:
          "Gratuit : la fiche d'informations de votre terrain (zone PLU, risques, protections) et le verdict de faisabilité de votre projet (réalisable, sous réserve ou incompatible) avec le début de l'analyse. Payant (Pack Étude) : l'analyse complète détaillée, les points d'attention, les suggestions d'optimisation, la liste personnalisée des documents à fournir avec le CERFA, et l'assistant questions/réponses.",
      },
      {
        question: "Combien de temps ai-je accès à l'assistant après l'achat ?",
        answer:
          "L'assistant questions/réponses reste disponible pendant 30 jours après le paiement, avec des questions illimitées. Il connaît votre projet, le résultat de votre analyse et les règles d'urbanisme de votre parcelle. Le reste de votre analyse (résultats, documents) reste accessible sans limite de durée.",
      },
      {
        question: 'Puis-je relancer une analyse si je modifie mon projet ?',
        answer:
          "Oui. Vous pouvez modifier vos réponses au questionnaire et relancer l'analyse du projet. Si votre projet change fondamentalement (autre type de travaux, autre terrain), créez plutôt un nouveau projet.",
      },
      {
        question: "Le pack est-il valable pour tous mes projets ?",
        answer:
          "Non, chaque pack débloque un seul projet (un terrain + un type de travaux). Cela permet de ne payer que pour ce dont vous avez besoin. Vos autres projets restent consultables gratuitement jusqu'au verdict de faisabilité.",
      },
    ],
  },
  {
    title: 'Paiement',
    entries: [
      {
        question: 'Comment se passe le paiement ?',
        answer:
          "Le paiement s'effectue par carte bancaire en une seule fois, via la plateforme sécurisée Stripe. Aucun abonnement, aucun prélèvement récurrent : vous payez uniquement le pack choisi pour le projet concerné. Un reçu vous est envoyé par e-mail.",
      },
      {
        question: 'Puis-je me faire rembourser ?',
        answer:
          "L'analyse complète étant un contenu numérique fourni immédiatement après le paiement, vous renoncez expressément à votre droit de rétractation au moment de l'achat (article L221-28 du Code de la consommation), comme indiqué dans nos CGV. En cas de problème technique (analyse indisponible, erreur manifeste), contactez-nous à contact@mon-urba.fr : nous trouverons une solution.",
      },
      {
        question: 'Où retrouver mes reçus et mon historique d’achats ?',
        answer:
          "Dans le menu de votre compte (icône en haut à droite), rubrique « Mes achats » : vous y retrouvez chaque pack acheté, le projet associé, le montant et le lien vers le reçu Stripe.",
      },
    ],
  },
  {
    title: 'Compte',
    entries: [
      {
        question: "J'ai oublié mon mot de passe, que faire ?",
        answer:
          "Cliquez sur « Mot de passe oublié ? » sur la page de connexion : vous recevrez par e-mail un lien de réinitialisation valable 1 heure. Pensez à vérifier vos courriers indésirables.",
      },
      {
        question: 'Comment modifier mes informations ou mon mot de passe ?',
        answer:
          "Dans le menu de votre compte, rubrique « Paramètres » : vous pouvez y modifier votre prénom et votre nom, et changer votre mot de passe.",
      },
      {
        question: 'Comment supprimer mon compte ?',
        answer:
          "Dans « Paramètres », section « Supprimer mon compte ». La suppression est définitive : vos projets, analyses et données personnelles sont effacés, conformément au RGPD. Les justificatifs de paiement restent conservés par notre prestataire de paiement pour répondre aux obligations comptables.",
      },
      {
        question: 'Comment vous contacter ?',
        answer:
          "Par e-mail à contact@mon-urba.fr. Nous lisons tous les messages et répondons aussi vite que possible.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="px-4 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight">
              Questions fréquentes
            </h1>
            <p className="mt-1 text-muted-foreground">
              Tout ce qu&apos;il faut savoir sur MonUrba, les autorisations
              d&apos;urbanisme et votre analyse.
            </p>

            <div className="mt-8 space-y-8">
              {FAQ_SECTIONS.map((section) => (
                <section
                  key={section.title}
                  className="rounded-lg border bg-white p-6"
                >
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                  <Accordion type="single" collapsible className="mt-2">
                    {section.entries.map((entry) => (
                      <AccordionItem key={entry.question} value={entry.question}>
                        <AccordionTrigger>{entry.question}</AccordionTrigger>
                        <AccordionContent>{entry.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              ))}
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              Vous ne trouvez pas votre réponse ?{' '}
              <Link href="/contact" className="text-primary hover:underline">
                Contactez-nous
              </Link>{' '}
              ou écrivez-nous directement à{' '}
              <a
                href="mailto:contact@mon-urba.fr"
                className="text-primary hover:underline"
              >
                contact@mon-urba.fr
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
