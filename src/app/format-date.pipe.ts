import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatDate',
  standalone: true,
})
export class FormatDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return value; // Return original if invalid date
    }

    // Format date
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    // Get timezone offset in hours
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetSign = offsetMinutes > 0 ? '-' : '+';
    const gmtOffset = `GMT${offsetSign}${offsetHours}`;

    return `${day} ${month} ${year} • ${hours}:${minutes}:${seconds} `;
  }
}
