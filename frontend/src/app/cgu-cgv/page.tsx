import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/layout/LegalPageLayout';

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation et de vente | mon-urba",
  description:
    "CGU et CGV de mon-urba.fr : conditions d'utilisation du service, packs payants, paiement, droit de rétractation.",
};

// [À COMPLÉTER] : médiateur de la consommation à désigner avant la mise en
// vente (obligation pour tout professionnel vendant à des consommateurs).
export default function CguCgvPage() {
  return (
    <LegalPageLayout
      title="Conditions générales d'utilisation et de vente"
      updatedAt="17 juillet 2026 — version 1.0"
    >
      <section>
        <h2>1. Objet</h2>
        <p className="mt-2">
          Les présentes conditions régissent l&apos;utilisation du site
          mon-urba.fr (« le Service »), édité par la structure identifiée dans
          les <a href="/mentions-legales">mentions légales</a> (« l&apos;Éditeur
          »), ainsi que la vente des packs payants proposés sur le Site. La
          création d&apos;un compte ou l&apos;achat d&apos;un pack emporte
          acceptation pleine et entière des présentes conditions.
        </p>
      </section>

      <section>
        <h2>2. Description du Service</h2>
        <p className="mt-2">
          Le Service aide les particuliers à préparer leurs démarches
          d&apos;urbanisme : consultation d&apos;informations réglementaires
          sur un terrain, analyse indicative de faisabilité d&apos;un projet,
          liste indicative des documents à fournir et assistant de questions /
          réponses.
        </p>
        <p className="mt-2 font-medium">
          Le Service fournit une aide documentaire automatisée et ne constitue
          ni un conseil juridique, ni une garantie d&apos;obtention d&apos;une
          autorisation d&apos;urbanisme. Seule la décision du service
          instructeur de la commune fait foi.
        </p>
      </section>

      <section>
        <h2>3. Compte utilisateur</h2>
        <p className="mt-2">
          La création d&apos;un compte est nécessaire pour créer un projet.
          L&apos;utilisateur s&apos;engage à fournir des informations exactes
          et à préserver la confidentialité de ses identifiants. Il peut
          demander la suppression de son compte à tout moment en écrivant à{' '}
          <a href="mailto:contact@mon-urba.fr">contact@mon-urba.fr</a>.
        </p>
      </section>

      <section>
        <h2>4. Packs payants et prix</h2>
        <p className="mt-2">
          Les fonctionnalités avancées d&apos;un projet (analyse complète,
          liste détaillée des documents, assistant) sont débloquées par
          l&apos;achat d&apos;un pack, au prix affiché au moment de
          l&apos;achat, toutes taxes comprises. Chaque pack est attaché à un
          projet unique : le débloquer pour un projet ne débloque pas les
          autres projets du compte. L&apos;accès à l&apos;assistant est ouvert
          pendant 30 jours à compter du paiement.
        </p>
      </section>

      <section>
        <h2>5. Paiement</h2>
        <p className="mt-2">
          Le paiement s&apos;effectue en une fois, par carte bancaire, via la
          plateforme sécurisée Stripe. Aucun abonnement ni prélèvement
          récurrent n&apos;est mis en place. L&apos;accès aux fonctionnalités
          du pack est ouvert immédiatement après confirmation du paiement.
        </p>
      </section>

      <section>
        <h2>6. Droit de rétractation</h2>
        <p className="mt-2">
          Conformément à l&apos;article L221-28 1° du Code de la consommation,
          le droit de rétractation ne peut être exercé pour un contrat de
          fourniture d&apos;un contenu numérique non fourni sur support
          matériel dont l&apos;exécution a commencé avant la fin du délai de
          rétractation, avec l&apos;accord préalable exprès du consommateur et
          son renoncement exprès à ce droit. En achetant un pack,
          l&apos;utilisateur demande l&apos;exécution immédiate du Service et
          renonce expressément à son droit de rétractation.
        </p>
      </section>

      <section>
        <h2>7. Responsabilité</h2>
        <p className="mt-2">
          L&apos;Éditeur met en œuvre des moyens raisonnables pour assurer
          l&apos;exactitude des informations issues des sources publiques
          (Géoportail de l&apos;urbanisme, cadastre, Géorisques…) et la qualité
          des analyses automatisées, sans garantir leur exhaustivité ni leur
          exactitude. La responsabilité de l&apos;Éditeur ne saurait être
          engagée en cas de refus d&apos;autorisation, de retard
          d&apos;instruction ou de toute décision administrative. En tout état
          de cause, la responsabilité de l&apos;Éditeur est limitée au montant
          du pack acheté.
        </p>
      </section>

      <section>
        <h2>8. Réclamations et médiation</h2>
        <p className="mt-2">
          Toute réclamation peut être adressée à{' '}
          <a href="mailto:contact@mon-urba.fr">contact@mon-urba.fr</a>. À
          défaut de résolution amiable, le consommateur peut recourir
          a un médiateur de la consommation (exemple: https://www.mediateurfevad.fr/).
        </p>
      </section>

      <section>
        <h2>9. Droit applicable</h2>
        <p className="mt-2">
          Les présentes conditions sont soumises au droit français. Tout litige
          relève des juridictions françaises compétentes.
        </p>
      </section>
    </LegalPageLayout>
  );
}
