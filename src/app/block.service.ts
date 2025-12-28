import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, map } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class BlockService {
  // Replace mock data with actual API endpoint
  private apiUrl = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  private getHeaders(includeAuth: boolean = true): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    // ✅ ONLY access localStorage in the browser
    if (includeAuth && isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');

      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  getAllBlocks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/blocks`, { headers: this.getHeaders() });
  }

  getBlockById(blockId: string): Observable<any> {
    return this.http
      .get<any[]>(`${this.apiUrl}/blocks`, { headers: this.getHeaders(false) })
      .pipe(map((blocks: any[]) => blocks.find((b) => b.number === blockId)));
  }
}
