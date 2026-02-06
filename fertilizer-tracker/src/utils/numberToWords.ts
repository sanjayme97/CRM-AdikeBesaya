/**
 * Convert a number to words in the Indian numbering system.
 * e.g., 119840 → "One Lakh Nineteen Thousand Eight Hundred and Forty Only"
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function twoDigitWords(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? ' ' + ones[o] : '');
}

function threeDigitWords(n: number): string {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0 && rest > 0) return ones[h] + ' Hundred ' + twoDigitWords(rest);
  if (h > 0) return ones[h] + ' Hundred';
  return twoDigitWords(rest);
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Only';

  const num = Math.floor(Math.abs(amount));

  if (num === 0) return 'Zero Only';

  // Indian system: Crore, Lakh, Thousand, Hundred
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  const parts: string[] = [];

  if (crore > 0) parts.push(twoDigitWords(crore) + ' Crore');
  if (lakh > 0) parts.push(twoDigitWords(lakh) + ' Lakh');
  if (thousand > 0) parts.push(twoDigitWords(thousand) + ' Thousand');
  if (remainder > 0) {
    if (parts.length > 0 && remainder < 100) {
      parts.push('and ' + twoDigitWords(remainder));
    } else {
      parts.push(threeDigitWords(remainder));
    }
  }

  const prefix = amount < 0 ? 'Minus ' : '';
  return prefix + 'Rupees ' + parts.join(' ') + ' Only';
}
