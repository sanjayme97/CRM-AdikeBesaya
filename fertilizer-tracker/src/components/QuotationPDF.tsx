/**
 * QuotationPDF Component
 *
 * Generates a professional PDF quotation using @react-pdf/renderer.
 * Features: repeating header/footer on every page, proper page breaks,
 * grouped line items, materials required section, and grand total.
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
import type { Quotation, Lead, FieldVisit, Product, LineItemRow } from '../types';
import { CROP_PROBLEMS } from '../types';
import { numberToWords } from '../utils/numberToWords';

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

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN');
  } catch {
    return dateStr;
  }
};

// --- Styles ---

const HEADER_HEIGHT = 140; // pt — header image height at A4 width
const FOOTER_HEIGHT = 88;  // pt — footer image height at A4 width

const styles = StyleSheet.create({
  page: {
    paddingTop: HEADER_HEIGHT + 8,
    paddingBottom: FOOTER_HEIGHT + 8,
    paddingLeft: 20,
    paddingRight: 20,
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

  // Document info box
  docInfoBox: {
    border: '1pt solid #000',
    padding: 8,
    marginBottom: 10,
  },
  docInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Customer info
  customerInfo: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1pt solid #ccc',
  },
  paragraph: {
    marginBottom: 3,
  },
  bold: {
    fontFamily: 'NotoSans', fontWeight: 700,
  },

  // Section container
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'NotoSans', fontWeight: 700,
    fontSize: 11,
    marginBottom: 4,
  },

  // Materials required bullet list
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 8,
  },
  bullet: {
    width: 12,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
  },

  // Table styles
  categoryTitle: {
    fontFamily: 'NotoSans', fontWeight: 700,
    fontSize: 11,
    backgroundColor: '#f0f0f0',
    padding: '4 8',
    marginBottom: 2,
    marginTop: 8,
  },
  table: {
    marginBottom: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    borderBottom: '1pt solid #000',
    borderTop: '1pt solid #000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #000',
  },
  tableFooterRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
    borderTop: '1pt solid #000',
  },
  // Column widths
  cellSl:          { width: '6%',  padding: '4 4', borderRight: '0.5pt solid #000', borderLeft: '0.5pt solid #000' },
  cellParticular:  { width: '34%', padding: '4 4', borderRight: '0.5pt solid #000' },
  cellPacking:     { width: '14%', padding: '4 4', borderRight: '0.5pt solid #000' },
  cellQty:         { width: '10%', padding: '4 4', borderRight: '0.5pt solid #000', textAlign: 'right' },
  cellRate:        { width: '16%', padding: '4 4', borderRight: '0.5pt solid #000', textAlign: 'right' },
  cellAmount:      { width: '20%', padding: '4 4', borderRight: '0.5pt solid #000', textAlign: 'right' },
  cellTotalLabel:  { width: '80%', padding: '4 4', textAlign: 'right', fontFamily: 'NotoSans', fontWeight: 700, borderRight: '0.5pt solid #000', borderLeft: '0.5pt solid #000' },
  cellTotalValue:  { width: '20%', padding: '4 4', textAlign: 'right', fontFamily: 'NotoSans', fontWeight: 700, borderRight: '0.5pt solid #000' },
  headerCell: {
    fontFamily: 'NotoSans', fontWeight: 700,
    fontSize: 9,
  },

  // Grand total
  grandTotal: {
    border: '2pt solid #000',
    padding: 10,
    marginTop: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  grandTotalAmount: {
    fontFamily: 'NotoSans', fontWeight: 700,
    fontSize: 12,
    marginBottom: 4,
  },
  amountWords: {
    fontStyle: 'italic',
    fontSize: 10,
    marginBottom: 2,
  },
  costPerPlant: {
    fontSize: 9,
    color: '#444',
  },

  // Notes / Usage
  notesSection: {
    marginTop: 8,
    paddingTop: 6,
    borderTop: '1pt solid #ccc',
  },
  preWrap: {
    fontSize: 9,
    lineHeight: 1.5,
  },
});

// --- Props ---

interface QuotationPDFProps {
  quotation: Quotation;
  lead: Lead | null;
  visit: FieldVisit | null;
  lineItems: LineItemRow[];
  products: Product[];
}

// --- Component ---

export function QuotationPDF({ quotation, lead, visit, lineItems, products }: QuotationPDFProps) {
  const headerImg = `${window.location.origin}/quotation-header.jpg`;
  const footerImg = `${window.location.origin}/quotation-footer.jpg`;

  // Group items by category
  const grouped = new Map<string, LineItemRow[]>();
  lineItems.forEach((item) => {
    const product = products.find((p) => p.id === item.productId);
    const category = product?.category || 'General';
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push(item);
  });

  // Build identified problems as structured data for mixed-font rendering
  const problems = visit?.identifiedProblems?.length
    ? visit.identifiedProblems.map((key) => {
        const prob = CROP_PROBLEMS.find((p) => p.en === key);
        return { en: prob?.en || key, kn: prob?.kn || '' };
      })
    : [];

  let slNo = 1;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Fixed header — repeats every page */}
        <View fixed style={styles.header}>
          <Image src={headerImg} style={styles.headerImg} />
        </View>

        {/* Fixed footer — repeats every page */}
        <View fixed style={styles.footer}>
          <Image src={footerImg} style={styles.footerImg} />
        </View>

        {/* 1. Document info */}
        <View style={styles.docInfoBox}>
          <View style={styles.docInfoRow}>
            <Text>Q Number: <Text style={styles.bold}>{quotation.displayId}</Text></Text>
            <Text style={[styles.bold, { fontSize: 11 }]}>EVALUATION</Text>
            <Text>Date: <Text style={styles.bold}>{formatDate(quotation.quoteDate)}</Text></Text>
          </View>
        </View>

        {/* 2. Customer info */}
        {lead && (
          <View style={styles.customerInfo}>
            <Text style={styles.paragraph}>
              By the name of: <Text style={styles.bold}>{lead.farmerName}</Text>
            </Text>
            <Text style={styles.paragraph}>
              Location: <Text style={styles.bold}>
                {[lead.village, lead.taluk, lead.district].filter(Boolean).join(', ')}
              </Text>
            </Text>
            <Text style={styles.paragraph}>
              Contact: <Text style={styles.bold}>{lead.phone}</Text>
            </Text>
            <Text style={styles.paragraph}>
              Subject: Comprehensive crop care; Solutions for identified diseases and deficiencies.
            </Text>
          </View>
        )}

        {/* 3. Identified problems */}
        {problems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.paragraph}>Dear Sir/Madam,</Text>
            <Text style={styles.paragraph}>
              Upon our visit to your arecanut plantation, we have identified the following issues:{' '}
              {problems.map((p, idx) => (
                <Text key={idx}>
                  {idx > 0 ? ', ' : ''}{p.en}
                  {p.kn ? <Text style={{ fontFamily: 'NotoSansKannada' }}> ({p.kn})</Text> : null}
                </Text>
              ))}.
            </Text>
            <Text style={styles.paragraph}>
              We recommend the following treatment plan for your crops.
            </Text>
          </View>
        )}

        {/* 4. Crop info */}
        {lead && (
          <View style={styles.section}>
            <Text style={styles.bold}>Quotation details: <Text style={{ fontWeight: 400 }}>As follows</Text></Text>
            <Text style={styles.paragraph}>
              {lead.cropType}
              {lead.numPlants ? ` \u2013 ${lead.numPlants} Plants` : ''}
              {lead.cropAge ? `, ${lead.cropAge}` : ''}
              {lead.farmSizeAcres ? ` (${lead.farmSizeAcres} acres)` : ''}
            </Text>
          </View>
        )}

        {/* 5. Materials required — descriptive list */}
        {lineItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Materials required;</Text>
            {Array.from(grouped.entries()).map(([category, items]) => (
              <View key={category} style={{ marginBottom: 6 }}>
                <Text style={[styles.bold, { marginBottom: 3 }]}>{category} Materials;</Text>
                {items.map((item, idx) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <View key={idx} style={styles.bulletItem}>
                      <Text style={styles.bullet}>{'\u2022'}</Text>
                      <Text style={styles.bulletText}>
                        {item.productName}
                        {product?.dosage ? ` - ${product.dosage}` : ''}
                        {` = ${item.quantity}`}
                        {product?.description ? ` (${product.description})` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* 6. Pricing tables by category */}
        {lineItems.length > 0 && (
          <Text style={[styles.sectionTitle, { textTransform: 'uppercase', marginBottom: 6 }]}>
            Quotation
          </Text>
        )}
        {lineItems.length > 0 && Array.from(grouped.entries()).map(([category, items]) => {
          const categoryTotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
          return (
            <View key={category} style={{ marginBottom: 10 }} wrap={false}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.table}>
                {/* Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.cellSl, styles.headerCell]}>Sl</Text>
                  <Text style={[styles.cellParticular, styles.headerCell]}>Particular</Text>
                  <Text style={[styles.cellPacking, styles.headerCell]}>Packing</Text>
                  <Text style={[styles.cellQty, styles.headerCell]}>Qty</Text>
                  <Text style={[styles.cellRate, styles.headerCell]}>Rate</Text>
                  <Text style={[styles.cellAmount, styles.headerCell]}>Amount</Text>
                </View>
                {/* Body */}
                {items.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  return (
                    <View key={slNo} style={styles.tableRow}>
                      <Text style={styles.cellSl}>{slNo++}</Text>
                      <Text style={styles.cellParticular}>{item.productName}</Text>
                      <Text style={styles.cellPacking}>{product?.unit || ''}</Text>
                      <Text style={styles.cellQty}>{item.quantity}</Text>
                      <Text style={styles.cellRate}>{formatCurrency(item.unitPrice)}</Text>
                      <Text style={styles.cellAmount}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
                    </View>
                  );
                })}
                {/* Footer */}
                <View style={styles.tableFooterRow}>
                  <Text style={styles.cellTotalLabel}>Total</Text>
                  <Text style={styles.cellTotalValue}>{formatCurrency(categoryTotal)}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* 7. Grand total */}
        <View style={styles.grandTotal}>
          <Text style={styles.grandTotalAmount}>
            Total Amount: {formatCurrency(quotation.quoteAmount)}/-
          </Text>
          <Text style={styles.amountWords}>{numberToWords(quotation.quoteAmount)}</Text>
          {lead?.numPlants && lead.numPlants > 0 && (
            <Text style={styles.costPerPlant}>
              Cost per plant: {formatCurrency(Math.round(quotation.quoteAmount / lead.numPlants))}
            </Text>
          )}
        </View>

        {/* 8. Notes */}
        {quotation.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.bold}>Note:</Text>
            <Text style={styles.preWrap}>{quotation.notes}</Text>
          </View>
        )}

        {/* 9. Usage instructions */}
        {quotation.usageInstructions && (
          <View style={styles.notesSection}>
            <Text style={styles.bold}>How to Use;</Text>
            <Text style={styles.preWrap}>{quotation.usageInstructions}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
