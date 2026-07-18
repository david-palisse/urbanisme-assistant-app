import { jsPDF } from 'jspdf';
import { RequiredDocument, documentCategoryLabels } from '@/types';

interface DocumentsPdfInput {
  documents: RequiredDocument[];
  projectName?: string;
  /** Checked state of the on-screen checklist, reflected in the PDF */
  checkedDocs?: Record<string, boolean>;
}

const MARGIN_X = 18;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_X;

const REQUIREMENT_LABELS: Record<string, string> = {
  obligatoire: 'Obligatoire',
  conditionnel: 'Conditionnel',
  optionnel: 'Optionnel',
};

/**
 * Generate and download the required-documents checklist as a PDF, using the
 * same layout language as the terrain "fiche récap'" (lib/terrain-pdf.ts).
 */
export function downloadDocumentsPdf({
  documents,
  projectName,
  checkedDocs = {},
}: DocumentsPdfInput): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 20;

  const ensureRoom = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - 20) {
      doc.addPage();
      y = 20;
    }
  };

  const sectionTitle = (title: string) => {
    ensureRoom(14);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175); // blue-800
    doc.text(title, MARGIN_X, y);
    y += 1.5;
    doc.setDrawColor(191, 219, 254); // blue-200
    doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
  };

  const paragraph = (text: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
    ensureRoom(lines.length * 4.2 + 2);
    doc.text(lines, MARGIN_X, y);
    y += lines.length * 4.2 + 2;
    doc.setTextColor(0, 0, 0);
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text('Documents à fournir', MARGIN_X, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Générée le ${new Date().toLocaleDateString('fr-FR')} par MonUrba`,
    PAGE_WIDTH - MARGIN_X,
    y,
    { align: 'right' },
  );
  doc.setTextColor(0, 0, 0);
  y += 7;
  if (projectName) {
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(projectName, MARGIN_X, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
  }

  // Documents grouped by category, in the same order as on screen
  const grouped = documents.reduce<Record<string, RequiredDocument[]>>(
    (acc, document) => {
      const category = document.category || 'Autres';
      (acc[category] ??= []).push(document);
      return acc;
    },
    {},
  );

  for (const [category, docs] of Object.entries(grouped)) {
    sectionTitle(documentCategoryLabels[category] || category);

    for (const item of docs) {
      const checked = checkedDocs[item.id];
      const requirement =
        REQUIREMENT_LABELS[item.requirement] || item.requirement;
      const title = `${item.name}  [${requirement}]${item.cerfaNumber ? `  (${item.cerfaNumber})` : ''}`;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(title, CONTENT_WIDTH - 8) as string[];
      const descLines = item.description
        ? (doc.splitTextToSize(item.description, CONTENT_WIDTH - 8) as string[])
        : [];
      ensureRoom(titleLines.length * 5 + descLines.length * 4.2 + 5);

      // Checkbox reflecting the on-screen checklist state
      doc.setDrawColor(120, 120, 120);
      doc.rect(MARGIN_X, y - 3.2, 3.6, 3.6);
      if (checked) {
        doc.setFont('helvetica', 'normal');
        doc.text('x', MARGIN_X + 0.9, y - 0.2);
        doc.setFont('helvetica', 'bold');
      }

      doc.text(titleLines, MARGIN_X + 6, y);
      y += titleLines.length * 5;

      if (descLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);
        doc.text(descLines, MARGIN_X + 6, y);
        doc.setTextColor(0, 0, 0);
        y += descLines.length * 4.2;
      }
      y += 3;
    }
  }

  // Footer note
  y += 4;
  paragraph(
    'Liste indicative générée automatiquement à partir de votre projet et des règles ' +
      "d'urbanisme applicables à votre parcelle. Elle ne constitue pas un conseil juridique : " +
      'seule la décision du service instructeur de votre mairie fait foi.',
  );

  const projectSlug = (projectName || 'projet')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
  doc.save(`documents-${projectSlug}.pdf`);
}
