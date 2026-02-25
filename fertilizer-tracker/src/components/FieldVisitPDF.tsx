/**
 * FieldVisitPDF Component
 *
 * Generates a professional PDF field visit report using @react-pdf/renderer.
 * Features: repeating header/footer on every page, proper page breaks,
 * identified problems with Kannada text, and visit metadata.
 */

import {
  Document,
  Page,
  View,
  Text,
  Image,
  Font,
  StyleSheet,
} from '@react-pdf/renderer';
import type { FieldVisit, Lead } from '../types';
import { CROP_PROBLEMS } from '../types';

// --- Font Registration ---
// Noto Sans supports Latin + ₹ symbol; Noto Sans Kannada for Kannada script

Font.register({
  family: 'NotoSans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-latin-ext-400-italic.woff', fontWeight: 400, fontStyle: 'italic' },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff', fontWeight: 700 },
  ],
});

Font.register({
  family: 'NotoSansKannada',
  src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kannada/files/noto-sans-kannada-kannada-400-normal.woff',
});

// --- Helpers ---

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN');
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('en-IN')} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateStr;
  }
};

// --- Styles ---

const HEADER_HEIGHT = 140;
const FOOTER_HEIGHT = 88;

const styles = StyleSheet.create({
  page: {
    paddingTop: HEADER_HEIGHT + 8,
    paddingBottom: FOOTER_HEIGHT + 8,
    paddingLeft: 24,
    paddingRight: 24,
    fontFamily: 'NotoSans',
    fontSize: 10,
    lineHeight: 1.4,
    color: '#000',
  },

  // Fixed header/footer
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  headerImg: { width: '100%' },
  footerImg: { width: '100%' },

  // Title
  titleBox: {
    textAlign: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '2pt solid #333',
  },
  title: {
    fontFamily: 'NotoSans', fontWeight: 700,
    fontSize: 14,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 9,
    color: '#666',
  },

  // Info rows
  infoBox: {
    border: '1pt solid #ccc',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: '30%',
    fontFamily: 'NotoSans', fontWeight: 700,
    fontSize: 9,
    color: '#555',
  },
  infoValue: {
    width: '70%',
    fontSize: 10,
  },

  // Section
  sectionTitle: {
    fontFamily: 'NotoSans', fontWeight: 700,
    fontSize: 11,
    backgroundColor: '#f0f0f0',
    padding: '4 8',
    marginBottom: 6,
    marginTop: 10,
  },

  // Status badge
  statusBadge: {
    fontSize: 10,
    fontFamily: 'NotoSans', fontWeight: 700,
    padding: '2 8',
    borderRadius: 10,
  },

  // Problems list
  problemItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  problemBullet: {
    width: 14,
    fontSize: 10,
  },
  problemText: {
    flex: 1,
    fontSize: 10,
  },

  // Notes
  notesText: {
    fontSize: 10,
    lineHeight: 1.5,
    padding: 8,
    backgroundColor: '#fafafa',
    borderRadius: 4,
  },

  // Two-column row
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },

  // Metadata
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metaLabel: {
    width: '40%',
    fontSize: 8,
    color: '#777',
  },
  metaValue: {
    width: '60%',
    fontSize: 8,
  },

  // Print date
  printDate: {
    fontSize: 7,
    color: '#999',
    textAlign: 'right',
    marginTop: 12,
  },
});

// --- Props ---

interface FieldVisitPDFProps {
  visit: FieldVisit;
  lead: Lead | null;
}

// --- Component ---

export function FieldVisitPDF({ visit, lead }: FieldVisitPDFProps) {
  const headerImg = `${window.location.origin}/quotation-header.jpg`;
  const footerImg = `${window.location.origin}/quotation-footer.jpg`;

  // Build identified problems
  const problems = visit.identifiedProblems?.length
    ? visit.identifiedProblems.map((key) => {
        const prob = CROP_PROBLEMS.find((p) => p.en === key);
        return { en: prob?.en || key, kn: prob?.kn || '' };
      })
    : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Fixed header */}
        <View fixed style={styles.header}>
          <Image src={headerImg} style={styles.headerImg} />
        </View>

        {/* Fixed footer */}
        <View fixed style={styles.footer}>
          <Image src={footerImg} style={styles.footerImg} />
        </View>

        {/* Title */}
        <View style={styles.titleBox}>
          <Text style={styles.title}>Field Visit Report</Text>
          <Text style={styles.subtitle}>
            {visit.displayId} | {formatDateTime(visit.scheduledDate)}
          </Text>
        </View>

        {/* Farmer Information */}
        {lead && (
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Farmer Name</Text>
              <Text style={styles.infoValue}>{lead.farmerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{lead.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>
                {[lead.village, lead.taluk, lead.district].filter(Boolean).join(', ')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Crop</Text>
              <Text style={styles.infoValue}>
                {lead.cropType}
                {lead.farmSizeAcres ? ` - ${lead.farmSizeAcres} acres` : ''}
                {lead.numPlants ? ` (${lead.numPlants} plants)` : ''}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lead ID</Text>
              <Text style={styles.infoValue}>{lead.displayId}</Text>
            </View>
          </View>
        )}

        {/* Visit Schedule */}
        <Text style={styles.sectionTitle}>Visit Schedule</Text>
        <View style={styles.infoBox}>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={[styles.infoValue, styles.statusBadge]}>
                  {visit.status}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Scheduled</Text>
                <Text style={styles.infoValue}>{formatDateTime(visit.scheduledDate)}</Text>
              </View>
              {visit.actualDate && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Actual Date</Text>
                  <Text style={styles.infoValue}>{formatDate(visit.actualDate)}</Text>
                </View>
              )}
            </View>
            <View style={styles.col}>
              {visit.visitOutcome && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Outcome</Text>
                  <Text style={styles.infoValue}>{visit.visitOutcome}</Text>
                </View>
              )}
              {visit.cropCondition && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Crop Condition</Text>
                  <Text style={styles.infoValue}>{visit.cropCondition}</Text>
                </View>
              )}
              {visit.followUpDate && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Follow-up</Text>
                  <Text style={styles.infoValue}>{formatDate(visit.followUpDate)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Identified Problems */}
        {problems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Identified Problems / Diseases
            </Text>
            <View style={styles.infoBox}>
              {problems.map((p, idx) => (
                <View key={idx} style={styles.problemItem}>
                  <Text style={styles.problemBullet}>{'\u2022'}</Text>
                  <Text style={styles.problemText}>
                    {p.en}
                    {p.kn ? <Text style={{ fontFamily: 'NotoSansKannada' }}> ({p.kn})</Text> : null}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Diagnosis Notes */}
        {visit.diagnosisNotes && (
          <>
            <Text style={styles.sectionTitle}>Diagnosis Notes</Text>
            <Text style={styles.notesText}>{visit.diagnosisNotes}</Text>
          </>
        )}

        {/* Assignment & Follow-up */}
        {(visit.visitedBy?.length > 0 || visit.quotationRequested || visit.assignedTo) && (
          <>
            <Text style={styles.sectionTitle}>Assignment</Text>
            <View style={styles.infoBox}>
              {visit.visitedBy?.length > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Visited By</Text>
                  <Text style={styles.infoValue}>
                    {visit.visitedBy.map((e) => e.split('@')[0]).join(', ')}
                  </Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Quotation Requested</Text>
                <Text style={styles.infoValue}>{visit.quotationRequested ? 'Yes' : 'No'}</Text>
              </View>
              {visit.assignedTo && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Assigned To</Text>
                  <Text style={styles.infoValue}>{visit.assignedTo.split('@')[0]}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Metadata */}
        <Text style={styles.sectionTitle}>Metadata</Text>
        <View style={{ flexDirection: 'row', gap: 20, marginBottom: 8 }}>
          <View style={styles.col}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Created By</Text>
              <Text style={styles.metaValue}>{visit.createdBy?.split('@')[0] || '-'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Created Date</Text>
              <Text style={styles.metaValue}>{formatDate(visit.createdDate)}</Text>
            </View>
          </View>
          <View style={styles.col}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Visitor</Text>
              <Text style={styles.metaValue}>{visit.visitorId?.split('@')[0] || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Print timestamp */}
        <Text style={styles.printDate}>
          Printed on: {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}
        </Text>
      </Page>
    </Document>
  );
}
