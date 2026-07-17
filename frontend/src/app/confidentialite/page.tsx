import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/layout/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Politique de confidentialité | mon-urba',
  description:
    'Politique de confidentialité de mon-urba.fr : données collectées, finalités, durées de conservation et droits RGPD.',
};

export default function ConfidentialitePage() {
  return (
    <LegalPageLayout
      title="Politique de confidentialité"
      updatedAt="17 juillet 2026"
    >
      <section>
        <h2>1. Responsable de traitement</h2>
        <p className="mt-2">
          Le responsable du traitement des données personnelles collectées sur
          mon-urba.fr est l&apos;éditeur du site, identifié dans les{' '}
          <a href="/mentions-legales">mentions légales</a>. Contact :{' '}
          <a href="mailto:contact@mon-urba.fr">contact@mon-urba.fr</a>.
        </p>
      </section>

      <section>
        <h2>2. Données collectées et finalités</h2>
        <ul className="mt-2">
          <li>
            <strong>Données de compte</strong> (e-mail, prénom, nom, mot de
            passe stocké sous forme hachée) — création et gestion de votre
            compte. Base légale : exécution du contrat.
          </li>
          <li>
            <strong>Données de projet</strong> (adresse ou parcelle du terrain,
            réponses au questionnaire, résultats d&apos;analyse, échanges avec
            l&apos;assistant) — fourniture du service d&apos;aide aux démarches
            d&apos;urbanisme. Base légale : exécution du contrat.
          </li>
          <li>
            <strong>Données de paiement</strong> — le paiement est traité par
            Stripe ; aucun numéro de carte n&apos;est stocké par mon-urba. Nous
            conservons l&apos;historique des achats (pack, montant, date,
            référence de transaction). Bases légales : exécution du contrat et
            obligations comptables.
          </li>
          <li>
            <strong>Journaux techniques</strong> (adresses IP, horodatages) —
            sécurité et bon fonctionnement du service. Base légale : intérêt
            légitime.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Cookies</h2>
        <p className="mt-2">
          Le Site n&apos;utilise que des traceurs strictement nécessaires au
          fonctionnement (authentification de session). Aucun cookie
          publicitaire ou de mesure d&apos;audience tierce n&apos;est déposé.
          C&apos;est pourquoi aucune bannière de consentement n&apos;est
          affichée. Cette politique sera mise à jour si des outils de mesure
          d&apos;audience sont ajoutés.
        </p>
      </section>

      <section>
        <h2>4. Destinataires et sous-traitants</h2>
        <p className="mt-2">
          Les données sont traitées par les prestataires suivants, agissant en
          qualité de sous-traitants :
        </p>
        <ul className="mt-2">
          <li>Vercel (hébergement de l&apos;interface web, États-Unis)</li>
          <li>
            Railway (hébergement des services applicatifs et de la base de
            données, États-Unis)
          </li>
          <li>Stripe (traitement des paiements)</li>
          <li>
            OpenAI (analyse automatisée des règlements d&apos;urbanisme et
            assistant : les caractéristiques du projet et les extraits de
            règlement nécessaires à l&apos;analyse lui sont transmis, sans
            données d&apos;identification du compte)
          </li>
        </ul>
        <p className="mt-2">
          Les transferts hors Union européenne sont encadrés par les clauses
          contractuelles types de la Commission européenne ou un mécanisme
          d&apos;adéquation (Data Privacy Framework le cas échéant).
        </p>
      </section>

      <section>
        <h2>5. Durées de conservation</h2>
        <ul className="mt-2">
          <li>
            Données de compte et de projets : tant que le compte est actif,
            puis suppression ou anonymisation.
          </li>
          <li>
            Pièces comptables liées aux achats : 10 ans (obligation légale).
          </li>
          <li>Journaux techniques : 12 mois maximum.</li>
        </ul>
      </section>

      <section>
        <h2>6. Vos droits</h2>
        <p className="mt-2">
          Conformément au RGPD et à la loi Informatique et Libertés, vous
          disposez d&apos;un droit d&apos;accès, de rectification,
          d&apos;effacement, de limitation, d&apos;opposition et de portabilité
          sur vos données. Vous pouvez exercer ces droits en écrivant à{' '}
          <a href="mailto:contact@mon-urba.fr">contact@mon-urba.fr</a>. Vous
          pouvez également introduire une réclamation auprès de la CNIL (
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            cnil.fr
          </a>
          ).
        </p>
      </section>
    </LegalPageLayout>
  );
}
