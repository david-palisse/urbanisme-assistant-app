import { jsPDF } from 'jspdf';
import {
  Address,
  FullLocationInfo,
  ParcelInfo,
} from '@/types';

interface TerrainRecapPdfInput {
  address: Address;
  fullInfo: FullLocationInfo | null;
  parcel: ParcelInfo | null;
}

const MARGIN_X = 18;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_X;

/**
 * Generate and download the "fiche récap'" PDF of a terrain: same
 * information as the on-screen recap (address, PLU, regulatory
 * constraints, Géorisques risks), laid out as a simple one-column document.
 */
export function downloadTerrainRecapPdf({ address, fullInfo, parcel }: TerrainRecapPdfInput): void {
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

  const field = (label: string, value: string | null | undefined) => {
    if (!value) return;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const labelText = `${label} : `;
    const labelWidth = doc.getTextWidth(labelText);
    const valueLines = doc.splitTextToSize(value, CONTENT_WIDTH - labelWidth) as string[];
    ensureRoom(valueLines.length * 5 + 2);
    doc.text(labelText, MARGIN_X, y);
    doc.setFont('helvetica', 'normal');
    doc.text(valueLines, MARGIN_X + labelWidth, y);
    y += valueLines.length * 5 + 1;
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
  doc.text("Fiche récap' du terrain", MARGIN_X, y);
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
  y += 6;

  // Localisation
  sectionTitle('Localisation');
  field('Adresse', address.rawInput);
  field(
    'Commune',
    address.cityName ? `${address.cityName}${address.postCode ? ` (${address.postCode})` : ''}` : null,
  );
  field('Code INSEE', address.inseeCode);
  field('Parcelle cadastrale', address.parcelId || parcel?.parcelId);
  field(
    'Coordonnées GPS',
    address.lat && address.lon ? `${address.lat.toFixed(6)}, ${address.lon.toFixed(6)}` : null,
  );

  // Zone PLU
  const pluZones = fullInfo?.pluZones || [];
  sectionTitle("Zone PLU (Plan Local d'Urbanisme)");
  field('Document', pluZones[0]?.documentName);
  field(
    'Zone principale',
    address.pluZone
      ? `${address.pluZone}${address.pluZoneLabel ? ` - ${address.pluZoneLabel}` : ''}`
      : 'Non identifiée',
  );
  if (pluZones.length > 1) {
    field(
      'Autres zones et prescriptions',
      pluZones
        .slice(1)
        .map((z) => z.zoneCode)
        .join(', '),
    );
  }

  // Contraintes réglementaires
  sectionTitle('Contraintes réglementaires');
  const flood = fullInfo?.floodZone;
  field(
    'Zone inondable',
    flood?.isInFloodZone
      ? `Oui - ${flood.zoneType || 'zone réglementée'}${flood.riskLevel ? ` (risque ${flood.riskLevel})` : ''}${flood.sourceName ? ` - ${flood.sourceName}` : ''}`
      : 'Non',
  );
  const abf = fullInfo?.abfProtection;
  field(
    'Protection ABF',
    abf?.isProtected
      ? `Oui - ${abf.protectionType || 'périmètre protégé'}${abf.monumentName ? ` (${abf.monumentName})` : ''}`
      : 'Non',
  );
  const peb = fullInfo?.noiseExposure;
  field(
    'Bruit aérien (PEB)',
    peb?.isInNoiseZone
      ? `Oui - Zone ${peb.zone || '?'}${peb.airportName ? ` - Aéroport de ${peb.airportName}` : ''}`
      : 'Non',
  );
  field('Sismicité', address.seismicZone ? `Zone ${address.seismicZone}` : null);
  field('Retrait-gonflement des argiles', address.clayRisk);

  // Autres risques Géorisques
  const otherRisks = fullInfo?.otherGeorisques || [];
  if (otherRisks.length > 0) {
    sectionTitle('Autres risques identifiés (Géorisques)');
    for (const risk of otherRisks) {
      const status = risk.statusAdresse || risk.statusCommune;
      field(risk.label, status || 'Signalé pour cette localisation');
    }
  }

  // Footer note
  y += 4;
  paragraph(
    'Document informatif généré automatiquement à partir des bases de données officielles ' +
      "(Géorisques, Géoportail de l'urbanisme, cadastre). Il ne se substitue pas aux documents " +
      "réglementaires en vigueur : vérifiez les règles applicables auprès de votre mairie avant tout projet.",
  );

  const citySlug = (address.cityName || 'terrain')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
  doc.save(`fiche-recap-${citySlug}.pdf`);
}
