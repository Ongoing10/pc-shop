const money = new Intl.NumberFormat('vi-VN');

/** 3590000 → "3.590.000 ₫" */
export function formatMoney(value: number): string {
  return `${money.format(value)} ₫`;
}

/** 4.6 → "4,6" */
export function formatRating(value: number): string {
  return value.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
