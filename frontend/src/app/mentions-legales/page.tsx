import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/layout/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Mentions légales | mon-urba',
  description:
    'Mentions légales du site mon-urba.fr : éditeur, hébergement, propriété intellectuelle et responsabilité.',
};

// [À COMPLÉTER] : les champs entre crochets doivent être renseignés avec les
// informations officielles de la structure avant la mise en vente.
export default function MentionsLegalesPage() {
  return (
    <LegalPageLayout title="Mentions légales" updatedAt="17 juillet 2026">
      <section>
        <h2>1. Éditeur du site</h2>
        <p className="mt-2">
          Le site <strong>mon-urba.fr</strong> (ci-après « le Site ») est édité
          par : [À COMPLÉTER : dénomination / nom et prénom de
          l&apos;entrepreneur, forme juridique, capital social le cas échéant],
          immatriculé(e) sous le numéro SIREN [À COMPLÉTER], dont le siège
          social est situé [À COMPLÉTER : adresse complète].
        </p>
        <ul className="mt-2">
          <li>Directeur de la publication : David Palisse</li>
          <li>
            Contact :{' '}
            <a href="mailto:contact@mon-urba.fr">contact@mon-urba.fr</a>
          </li>
          <li>
            Numéro de TVA intracommunautaire : [À COMPLÉTER ou « non
            applicable »]
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Hébergement</h2>
        <p className="mt-2">Le Site est hébergé par :</p>
        <ul className="mt-2">
          <li>
            Interface web : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA
            91789, États-Unis —{' '}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              vercel.com
            </a>
          </li>
          <li>
            Services applicatifs et base de données : Railway Corp., 548 Market
            Street, PMB 68956, San Francisco, CA 94104, États-Unis —{' '}
            <a
              href="https://railway.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              railway.com
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Propriété intellectuelle</h2>
        <p className="mt-2">
          L&apos;ensemble des éléments du Site (textes, interface, logo, marque
          « MonUrba », code, base de données) est protégé par le droit de la
          propriété intellectuelle. Toute reproduction ou représentation, totale
          ou partielle, sans autorisation écrite préalable de l&apos;éditeur est
          interdite.
        </p>
        <p className="mt-2">
          Les données publiques utilisées par le Site (Base Adresse Nationale,
          Géoportail de l&apos;urbanisme, cadastre, Géorisques) restent soumises
          à leurs licences respectives.
        </p>
      </section>

      <section>
        <h2>4. Nature du service et responsabilité</h2>
        <p className="mt-2">
          Le Site fournit une aide à la préparation des démarches
          d&apos;urbanisme à partir de documents et données publics. Les
          informations et analyses produites sont fournies à titre indicatif et
          ne constituent ni un conseil juridique, ni une décision
          administrative. Seule la décision du service instructeur de la
          commune concernée fait foi. L&apos;éditeur ne saurait être tenu
          responsable des décisions prises par l&apos;utilisateur sur la seule
          base des informations fournies par le Site.
        </p>
      </section>

      <section>
        <h2>5. Signalement</h2>
        <p className="mt-2">
          Pour toute question ou signalement concernant le Site, écrivez à{' '}
          <a href="mailto:contact@mon-urba.fr">contact@mon-urba.fr</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
}
