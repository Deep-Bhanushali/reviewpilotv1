/**
 * Currency utilities for Indian Rupees (INR)
 * All amounts are stored in paise (1 rupee = 100 paise) to avoid floating point errors
 */

export function formatCurrency(amountInPaise: number): string {
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function parseRupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function parsePaiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatCompactCurrency(amountInPaise: number): string {
  const rupees = amountInPaise / 100;
  if (rupees >= 10000000) { // 1 crore
    return `₹${(rupees / 10000000).toFixed(1)}Cr`;
  } else if (rupees >= 100000) { // 1 lakh
    return `₹${(rupees / 100000).toFixed(1)}L`;
  } else if (rupees >= 1000) { // 1 thousand
    return `₹${(rupees / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amountInPaise);
}

export function calculateProfit(refundAmount: number, orderAmount: number): number {
  return refundAmount - orderAmount;
}
