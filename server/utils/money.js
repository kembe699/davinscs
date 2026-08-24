// Rounds to 2 decimal places — the actual precision every money column in the
// database stores (NUMERIC(15,2)) — for computed amounts (tax on a fractional
// subtotal, a currency conversion, COGS) that would otherwise carry raw
// floating-point noise (e.g. 13.433000000000002) into a saved row. Never round
// further than this — an amount a user actually typed must reach the database
// exactly as entered, not snapped to a whole number.
export function roundToCents(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
