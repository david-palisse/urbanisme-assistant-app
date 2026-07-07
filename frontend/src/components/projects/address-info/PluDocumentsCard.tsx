'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PluDocumentFile, PluDocumentInfo } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileDown,
  FileText,
  Download,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface PluDocumentsCardProps {
  lat?: number | null;
  lon?: number | null;
}

const CATEGORY_LABELS: Record<PluDocumentFile['category'], string> = {
  reglement: 'Règlement écrit',
  reglement_graphique: 'Règlement graphique',
  rapport: 'Rapport de présentation',
  procedure: 'Procédure',
  annexe: 'Annexes',
  autre: 'Autres documents',
};

// Categories shown collapsed (the written regulation is always visible)
const COLLAPSED_CATEGORIES: PluDocumentFile['category'][] = [
  'reglement_graphique',
  'rapport',
  'procedure',
  'annexe',
  'autre',
];

function fileLabel(file: PluDocumentFile): string {
  // Filenames look like "244400404_reglement_20231206.pdf" - keep them as-is
  // but drop the extension for readability
  return file.name.replace(/\.pdf$/i, '');
}

function FileLink({ file }: { file: PluDocumentFile }) {
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-primary hover:underline"
      download
    >
      <FileText className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{fileLabel(file)}</span>
      <Download className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
    </a>
  );
}

// Card listing the urban planning documents (PLU/PLUi/PSMV/CC) covering the
// terrain, with direct download links from the Géoportail de l'Urbanisme
export function PluDocumentsCard({ lat, lon }: PluDocumentsCardProps) {
  const [documents, setDocuments] = useState<PluDocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lon == null) return;

    let cancelled = false;
    setIsLoading(true);
    api
      .getPluDocuments(lat, lon)
      .then((docs) => {
        if (!cancelled) setDocuments(docs);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  if (lat == null || lon == null) return null;
  if (!isLoading && documents.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Documents d&apos;urbanisme téléchargeables
        </CardTitle>
        <CardDescription>
          Consultez le règlement et les pièces officielles du document
          d&apos;urbanisme applicable à ce terrain (source : Géoportail de
          l&apos;Urbanisme)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Recherche des documents d&apos;urbanisme...
          </div>
        ) : (
          <div className="space-y-6">
            {documents.map((doc) => {
              const reglementFiles = doc.files.filter(
                (f) => f.category === 'reglement'
              );

              return (
                <div key={doc.documentId} className="space-y-3">
                  {/* Document header */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">
                        {doc.type}
                      </Badge>
                      <span className="text-sm font-medium">{doc.title}</span>
                    </div>
                    {doc.archiveUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={doc.archiveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Dossier complet (zip)
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Written regulation: always visible, it is the key document */}
                  {reglementFiles.length > 0 && (
                    <div className="space-y-1 rounded-md border bg-muted/30 p-3">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {CATEGORY_LABELS.reglement}
                      </div>
                      {reglementFiles.map((file) => (
                        <FileLink key={file.name} file={file} />
                      ))}
                    </div>
                  )}

                  {/* Other categories, collapsed by default */}
                  {COLLAPSED_CATEGORIES.map((category) => {
                    const files = doc.files.filter(
                      (f) => f.category === category
                    );
                    if (files.length === 0) return null;

                    return (
                      <details key={category} className="group rounded-md border px-3 py-2">
                        <summary className="flex cursor-pointer items-center justify-between text-sm font-medium list-none [&::-webkit-details-marker]:hidden">
                          <span>
                            {CATEGORY_LABELS[category]}{' '}
                            <span className="text-muted-foreground">
                              ({files.length})
                            </span>
                          </span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="mt-2 space-y-1">
                          {files.map((file) => (
                            <FileLink key={file.name} file={file} />
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
