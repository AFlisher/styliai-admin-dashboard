// Converts an ISO 3166-1 alpha-2 code (e.g. "US") into its flag emoji by
// mapping each letter onto a Unicode regional indicator symbol. No image
// assets or icon library needed.
export function countryCodeToFlagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return '🏳️';
  }

  const REGIONAL_INDICATOR_A = 0x1f1e6;
  const codePoints = Array.from(code).map(
    (char) => REGIONAL_INDICATOR_A + (char.charCodeAt(0) - 65)
  );
  return String.fromCodePoint(...codePoints);
}
