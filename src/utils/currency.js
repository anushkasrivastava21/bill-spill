export const CURRENCIES = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  THB: { symbol: '฿', locale: 'th-TH' },
  AED: { symbol: 'د.إ', locale: 'ar-AE' },
  SGD: { symbol: 'S$', locale: 'en-SG' },
  JPY: { symbol: '¥', locale: 'ja-JP' },
};

export function formatAmount(amount, currencyCode = 'INR') {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.INR;
  
  // Format the number nicely. We'll manually prepend the symbol 
  // because Intl.NumberFormat can sometimes use standard abbreviations 
  // instead of symbols depending on the locale.
  const formatter = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
  });
  
  return `${currency.symbol}${formatter.format(amount)}`;
}
