/**
 * Converts bashin (horse length) difference to human-readable format
 * Based on Umamusume game terminology
 * 
 * @param bashin - The bashin difference (1 bashin = 2.5m)
 * @returns Human-readable string representation
 */
export function formatBashin(bashin: number): string {
  const abs = Math.abs(bashin);
  
  // Very close finishes
  if (abs < 0.05) return 'Nose';
  if (abs < 0.125) return 'Head';
  if (abs < 0.25) return 'Neck';
  
  // Fractional lengths
  if (abs < 0.5) return '1/2 L';
  if (abs < 0.875) return '3/4 L';
  if (abs < 1.125) return '1 L';
  if (abs < 1.375) return '1 1/4 L';
  if (abs < 1.625) return '1 1/2 L';
  if (abs < 1.875) return '1 3/4 L';
  
  // Multiple lengths (2-10)
  if (abs < 10.5) {
    const lengths = Math.round(abs);
    return `${lengths} L`;
  }
  
  // Very large gaps
  return 'Distance';
}

/**
 * Converts bashin to human-readable format with raw bashin in parentheses
 * 
 * @param bashin - The bashin difference
 * @returns Formatted string like "5 L (5.23)" or "Neck (0.18)"
 */
export function formatBashinWithRaw(bashin: number): string {
  const abs = Math.abs(bashin);
  const readable = formatBashin(bashin);
  return `${readable} (${abs.toFixed(2)})`;
}
