'use client';

import { MairieContact } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Landmark, MapPin, Phone, Mail, Globe, ExternalLink } from 'lucide-react';

interface MairieContactCardProps {
  contact: MairieContact;
}

export function MairieContactCard({ contact }: MairieContactCardProps) {
  const postalLine = [contact.postalCode, contact.city]
    .filter(Boolean)
    .join(' ');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          Où déposer votre dossier
        </CardTitle>
        <CardDescription>
          Votre dossier complet devra être déposé ou envoyé par courrier
          recommandé à l&apos;adresse ci-dessous. Pour toute question sur votre
          demande, vous pouvez contacter directement ce service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">{contact.name}</p>
            {contact.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {postalLine && <p>{postalLine}</p>}
          </div>
        </div>

        {contact.phone && (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="text-sm hover:underline">
              {contact.phone}
            </a>
          </div>
        )}

        {contact.email && (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a href={`mailto:${contact.email}`} className="text-sm hover:underline">
              {contact.email}
            </a>
          </div>
        )}

        {contact.website && (
          <div className="flex items-center gap-3">
            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a
              href={contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
            >
              {contact.website}
            </a>
          </div>
        )}

        {contact.annuaireUrl && (
          <a
            href={contact.annuaireUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
          >
            Voir la fiche complète sur service-public.gouv.fr
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
