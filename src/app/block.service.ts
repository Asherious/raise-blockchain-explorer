import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, shareReplay, BehaviorSubject } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class BlockService {
  // Replace mock data with actual API endpoint
  private apiUrl = 'http://localhost:3000';

  // Cache for blocks data
  private blocksCache: Observable<any[]> | null = null;
  private blocksData: any[] | null = null;

  // Cache for latest block number
  private latestBlockNumber$ = new BehaviorSubject<number>(0);
  private latestBlockCacheTime = 0;
  private readonly LATEST_BLOCK_CACHE_TTL = 30000; // 30 seconds

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  private getHeaders(includeAuth: boolean = true): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    if (includeAuth && isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');

      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  // Get cached blocks or fetch from server
  getAllBlocks(forceRefresh: boolean = false): Observable<any[]> {
    const now = Date.now();

    if (this.blocksCache && !forceRefresh && this.blocksData) {
      // Return cached data
      return new Observable((subscriber) => {
        subscriber.next(this.blocksData ? [...this.blocksData] : []);
        subscriber.complete();
      });
    }

    this.blocksCache = this.http
      .get<any[]>(`${this.apiUrl}/blocks`, { headers: this.getHeaders() })
      .pipe(shareReplay(1));

    return this.blocksCache.pipe(
      map((blocks) => {
        this.blocksData = blocks;
        // Update latest block number cache
        if (blocks && blocks.length > 0) {
          const maxBlock = Math.max(...blocks.map((b) => parseInt(b.number, 10)));
          this.latestBlockNumber$.next(maxBlock);
          this.latestBlockCacheTime = now;
        }
        return blocks;
      }),
    );
  }

  // Get cached latest block number (synchronous if available)
  getLatestBlockNumber(): number {
    return this.latestBlockNumber$.value;
  }

  // Observe latest block number changes
  getLatestBlockNumberObservable(): Observable<number> {
    return this.latestBlockNumber$.asObservable();
  }

  // Check if latest block cache is valid
  isLatestBlockCacheValid(): boolean {
    return Date.now() - this.latestBlockCacheTime < this.LATEST_BLOCK_CACHE_TTL;
  }

  // Fetch latest block number (uses cache if valid)
  fetchLatestBlockNumber(forceRefresh: boolean = false): Observable<number> {
    if (!forceRefresh && this.isLatestBlockCacheValid() && this.latestBlockNumber$.value > 0) {
      return new Observable((sub) => {
        sub.next(this.latestBlockNumber$.value);
        sub.complete();
      });
    }

    return this.getAllBlocks(forceRefresh).pipe(
      map((blocks) => {
        if (blocks && blocks.length > 0) {
          return Math.max(...blocks.map((b) => parseInt(b.number, 10)));
        }
        return 0;
      }),
    );
  }

  // Get cached block by number
  getCachedBlockByNumber(blockNumber: string): any | null {
    if (!this.blocksData) return null;
    return this.blocksData.find((block) => block.number === blockNumber);
  }

  // Get cached block by hash
  getCachedBlockByHash(hash: string): any | null {
    if (!this.blocksData) return null;
    return this.blocksData.find(
      (block) =>
        block.dataHash === hash ||
        block.currentBlockHash === hash ||
        block.previousBlockHash === hash,
    );
  }

  // Get cached block by txId
  getCachedBlockByTxId(txId: string): any | null {
    if (!this.blocksData) return null;
    return this.blocksData.find((block) => block.txIds && block.txIds.includes(txId));
  }

  // Search blocks using cache first, then API if needed
  searchBlock(id: string): { type: 'number' | 'hash' | 'txid' | 'key' | null; block: any | null } {
    // Try cache first
    let result = this.getCachedBlockByNumber(id);
    if (result) return { type: 'number', block: result };

    result = this.getCachedBlockByHash(id);
    if (result) return { type: 'hash', block: result };

    result = this.getCachedBlockByTxId(id);
    if (result) return { type: 'txid', block: result };

    return { type: null, block: null };
  }

  getBlockByNumber(blockNumber: string): Observable<any> {
    // Try cache first
    const cached = this.getCachedBlockByNumber(blockNumber);
    if (cached) {
      return new Observable((sub) => {
        sub.next(cached);
        sub.complete();
      });
    }

    return this.getAllBlocks().pipe(
      map((blocks: any[]) => blocks.find((block) => block.number === blockNumber)),
    );
  }

  getBlockByDataHash(dataHash: string): Observable<any> {
    // Try cache first
    const cached = this.blocksData?.find((block) => block.dataHash === dataHash);
    if (cached) {
      return new Observable((sub) => {
        sub.next(cached);
        sub.complete();
      });
    }

    return this.getAllBlocks().pipe(
      map((blocks: any[]) => blocks.find((block) => block.dataHash === dataHash)),
    );
  }

  getBlockByCurrentBlockHash(currentBlockHash: string): Observable<any> {
    // Try cache first
    const cached = this.blocksData?.find((block) => block.currentBlockHash === currentBlockHash);
    if (cached) {
      return new Observable((sub) => {
        sub.next(cached);
        sub.complete();
      });
    }

    return this.getAllBlocks().pipe(
      map((blocks: any[]) => blocks.find((block) => block.currentBlockHash === currentBlockHash)),
    );
  }

  getPreviousBlockHash(blockNumber: string): Observable<any> {
    // Try cache first
    const cached = this.blocksData?.find((block) => block.number === blockNumber);
    if (cached) {
      return new Observable((sub) => {
        sub.next(cached?.previousBlockHash);
        sub.complete();
      });
    }

    return this.getAllBlocks().pipe(
      map(
        (blocks: any[]) => blocks.find((block) => block.number === blockNumber)?.previousBlockHash,
      ),
    );
  }

  getBlockByTxId(txId: string): Observable<any> {
    // Try cache first
    const cached = this.getCachedBlockByTxId(txId);
    if (cached) {
      return new Observable((sub) => {
        sub.next(cached);
        sub.complete();
      });
    }

    return this.getAllBlocks().pipe(
      map((blocks: any[]) => blocks.find((block) => block.txIds && block.txIds.includes(txId))),
    );
  }

  getBlockByKey(key: string): Observable<any> {
    // Query all assets and find the one with matching key
    return this.http.get<any[]>(`${this.apiUrl}/assets`, { headers: this.getHeaders(false) }).pipe(
      map((assets) => {
        const asset = assets.find((a) => a.key === key);
        if (asset?.record?.txId) {
          // txId is inside record
          return asset.record.txId;
        }
        return null;
      }),
    );
  }

  getBlockTxDetails(txId: string): Observable<any> {
    if (!txId) return new Observable((sub) => sub.complete());

    return this.http.get<any>(`${this.apiUrl}/assets`, {
      headers: this.getHeaders(false),
      params: { txId },
    });
  }
}
