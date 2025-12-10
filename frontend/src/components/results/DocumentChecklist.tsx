'use client';

import { useState } from 'react';
import { RequiredDocument, documentCategoryLabels } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  ExternalLink,
  Printer,
  Download,
  CheckCircle2,
  Circle,
} from 'lucide-react';

interface DocumentChecklistProps {
  documents: RequiredDocument[];
  projectName?: string;
}

export function DocumentChecklist({
  documents,
  projectName,
}: DocumentChecklistProps) {
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  const toggleDocument = (docId: string) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const checkedCount = Object.values(checkedDocs).filter(Boolean).length;
  const totalCount = documents.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  // Group documents by category
  const groupedDocuments = documents.reduce<
    Record<string, RequiredDocument[]>
  >((acc, doc) => {
    const category = doc.category || 'Autres';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {});

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const content = documents
      .map(
        (doc) =>
          `${checkedDocs[doc.id] ? '[x]' : '[ ]'} ${doc.name}${
            doc.description ? ` - ${doc.description}` : ''
          }${doc.cerfaNumber ? ` (${doc.cerfaNumber})` : ''}`
      )
      .join('\n');

    const blob = new Blob(
      [
        `Documents requis pour: ${projectName || 'Projet'}\n\n${content}\n\nListe générée le ${new Date().toLocaleDateString(
          'fr-FR'
        )}`,
      ],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documents-${projectName?.toLowerCase().replace(/\s+/g, '-') || 'projet'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents requis
              </CardTitle>
              <CardDescription className="mt-1">
                {checkedCount} sur {totalCount} documents préparés
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {progress === 100
              ? '✓ Tous les documents sont prêts !'
              : `${Math.round(progress)}% complété`}
          </p>
        </CardContent>
      </Card>

      {/* Document Categories */}
      {Object.entries(groupedDocuments).map(([category, docs]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">
              {documentCategoryLabels[category] || category}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    checkedDocs[doc.id]
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDocument(doc.id)}
                      className="mt-0.5"
                    >
                      {checkedDocs[doc.id] ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4
                            className={`font-medium ${
                              checkedDocs[doc.id]
                                ? 'line-through text-muted-foreground'
                                : ''
                            }`}
                          >
                            {doc.name}
                          </h4>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {doc.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.mandatory && (
                            <Badge variant="destructive">Obligatoire</Badge>
                          )}
                          {doc.cerfaNumber && (
                            <Badge variant="outline">{doc.cerfaNumber}</Badge>
                          )}
                        </div>
                      </div>
                      {doc.cerfaUrl && (
                        <a
                          href={doc.cerfaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Télécharger le formulaire CERFA
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Help Text */}
      <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Conseil</p>
            <p>
              Les documents cochés comme &quot;Obligatoire&quot; sont indispensables pour
              le dépôt de votre dossier. Les autres peuvent être demandés selon
              les spécificités de votre projet. En cas de doute, contactez le
              service urbanisme de votre mairie.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
