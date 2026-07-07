'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Download } from 'lucide-react';

interface PluDocumentLinkProps {
  documentName: string;
  documentId?: string;
  className?: string;
}

// PLU document name, clickable to download the règlement PDF when available
export function PluDocumentLink({
  documentName,
  documentId,
  className,
}: PluDocumentLinkProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    api.getPluDocumentUrl(documentId).then((result) => {
      if (!cancelled) setUrl(result);
    });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (!url) {
    return <div className={className}>{documentName}</div>;
  }

  return (
    <div className={className}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Télécharger le règlement du document d'urbanisme (PDF)"
        className="inline-flex items-center gap-1 hover:underline"
      >
        {documentName}
        <Download className="h-3 w-3 flex-shrink-0" />
      </a>
    </div>
  );
}
