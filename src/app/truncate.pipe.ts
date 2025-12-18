import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncateHash',
  standalone: true,
})
export class TruncateHashPipe implements PipeTransform {
  /**
   * Truncates a string by showing the first few characters, the last few, and replacing the middle with an ellipsis.
   * @param value The full string (e.g., a hash).
   * @param startChars The number of characters to show at the start (default: 6).
   * @param endChars The number of characters to show at the end (default: 6).
   * @returns The truncated string (e.g., 'b1d0e9...f1020').
   */
  transform(
    value: string | null | undefined,
    startChars: number = 6,
    endChars: number = 6,
  ): string {
    // 1. Handle null, undefined, or empty values
    if (!value) {
      return '';
    } // 2. Check if truncation is necessary

    const totalLength = value.length;
    const minimumLengthForTruncation = startChars + endChars + 3; // +3 for "..."

    if (totalLength <= minimumLengthForTruncation) {
      return value;
    } // 3. Perform truncation

    const start = value.substring(0, startChars);
    const end = value.substring(totalLength - endChars);

    return `${start}...${end}`;
  }
}
