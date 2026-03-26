import { Component, inject, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { AppService } from '../app.service';
import { FormatDatePipe } from '../format-date.pipe';
import { Subscription } from 'rxjs';
import { environment } from '../../environment/environment';

@Component({
  selector: 'app-block-details',
  standalone: true,
  imports: [CommonModule, FormatDatePipe],
  templateUrl: './block-details.html',
  styleUrls: ['./block-details.css'],
})
export class BlockDetails implements OnInit {
  // X-axis tick placeholders
  ticks = Array.from({ length: 9 });
  // Clipboard copy feedback
  copied: string | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appService = inject(AppService);
  private cdr = inject(ChangeDetectorRef);

  block?: any;
  loading = true;
  error: string | null = null;
  txDetailsMap = new Map<string, any>();
  loadingTx = new Set<string>();
  openSet = new Set<number>();
  latestBlockNumber = 0;

  // Track how the block was loaded
  searchedId: string = '';
  loadMethod: 'number' | 'hash' | 'txid' | 'key' = 'number';

  private previousId: string = '';

  private routeSub?: Subscription;

  // Cache searchType per ID to prevent repeated calls
  private searchTypeCache = new Map<string, 'number' | 'hash' | 'txid' | 'key'>();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  // Subscribe to route params
  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Get latest block number
    this.latestBlockNumber = this.appService.getLatestBlockNumber();
    this.appService.getLatestBlockNumberObservable().subscribe((num) => {
      if (num > 0) {
        this.latestBlockNumber = num;
        this.cdr.detectChanges();
      }
    });

    // Ensure cache is loaded first
    if (!this.appService.hasBlocksCache()) {
      await firstValueFrom(this.appService.getAllBlocks());
    }

    // Subscribe to route changes, only fire when blockNumber changes
    this.routeSub = this.route.paramMap
      .pipe(
        map((params) => params.get('blockNumber') ?? ''),
        distinctUntilChanged(),
      )
      .subscribe(async (id) => {
        if (!id) return;
        this.searchedId = id;
        await this.tryLoadBlock(id);
      });
  }
  // Cleanup subscription
  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  // --- Determine search type once per ID ---
  private async getSearchType(id: string): Promise<'number' | 'hash' | 'txid' | 'key'> {
    if (this.searchTypeCache.has(id)) return this.searchTypeCache.get(id)!;

    let type: 'number' | 'hash' | 'txid' | 'key';

    if (/^\d+$/.test(id)) type = 'number';
    else if (/^[a-fA-F0-9]{64}$/.test(id)) {
      try {
        const txData = await firstValueFrom(this.appService.getBlockByTxId(id));
        type = txData?.number ? 'txid' : 'hash';
      } catch {
        type = 'hash';
      }
    } else if (/^[a-fA-F0-9]+$/.test(id)) type = 'txid';
    else type = 'key';

    this.searchTypeCache.set(id, type);
    return type;
  }

  // --- Load block based on search type ---
  private async tryLoadBlock(id: string): Promise<void> {
    if (id === this.previousId) return; // prevent duplicate
    this.previousId = id;

    this.loading = true;
    this.error = null;
    this.block = null;
    this.openSet.clear();
    this.txDetailsMap.clear();
    this.loadingTx.clear();

    const searchType = await this.getSearchType(id);
    const apiUrl = this.appService.getApiUrl();

    console.log('Search Type:', searchType);
    console.log('Current URL:', this.router.url);

    // Try cache first
    const cachedResult = this.appService.searchBlock(id);
    if (cachedResult.block) {
      this.loadMethod = cachedResult.type || searchType;
      this.block = cachedResult.block;
      this.loading = false;

      if (searchType === 'txid' || cachedResult.type === 'txid') {
        const txIdToFind = this.searchedId;
        const index = this.block.txIds?.indexOf(txIdToFind);
        if (index !== undefined && index !== -1) {
          this.openSet.add(index);
          this.loadTxDetails(txIdToFind);
        }
      }

      this.cdr.detectChanges();
      return; // stop further API calls
    }

    // Key-based search
    const keyResult = await firstValueFrom(this.appService.searchBlockByKey(id));
    if (keyResult.block) {
      this.loadMethod = 'key';
      this.block = keyResult.block;
      this.loading = false;

      const txIdFromKey = await firstValueFrom(this.appService.getBlockByKey(id));
      if (txIdFromKey) {
        const index = this.block.txIds?.indexOf(txIdFromKey);
        if (index !== undefined && index !== -1) {
          this.openSet.add(index);
          this.loadTxDetails(txIdFromKey);
        }
      }

      this.cdr.detectChanges();
      return;
    }

    // Fetch from API based on type
    let data: any = null;
    try {
      switch (searchType) {
        case 'number':
          data = await firstValueFrom(this.appService.getBlockByNumber(id));
          this.loadMethod = 'number';
          break;

        case 'hash':
          const [byDataHash, byCurrentHash] = await Promise.all([
            firstValueFrom(this.appService.getBlockByDataHash(id)),
            firstValueFrom(this.appService.getBlockByCurrentBlockHash(id)),
          ]);
          data = byDataHash || byCurrentHash;
          this.loadMethod = 'hash';
          break;

        case 'txid':
          data = await firstValueFrom(this.appService.getBlockByTxId(id));
          this.loadMethod = 'txid';
          break;

        case 'key':
          const txId = await firstValueFrom(this.appService.getBlockByKey(id));
          if (txId) {
            data = await firstValueFrom(this.appService.getBlockByTxId(txId));
          }
          this.loadMethod = 'key';
          break;
      }

      if (data?.number) {
        this.block = data;
        this.openSet.clear();

        // Auto-expand tx if txid or key
        const txToFind =
          searchType === 'txid'
            ? this.searchedId
            : await firstValueFrom(this.appService.getBlockByKey(this.searchedId));
        if (txToFind) {
          const index = this.block.txIds?.indexOf(txToFind);
          if (index !== undefined && index !== -1) {
            this.openSet.add(index);
            this.loadTxDetails(txToFind);
          }
        }
      }
    } catch {
      this.error = 'Failed to load block';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
  // Load transaction details for a given txId
  loadTxDetails(txId: string) {
    if (!txId || this.txDetailsMap.has(txId) || this.loadingTx.has(txId)) return;

    this.loadingTx.add(txId);

    this.appService.getBlockTxDetails(txId).subscribe({
      next: (txData) => {
        if (!txData || !txData.asset) {
          this.txDetailsMap.set(txId, null);
          return;
        }

        // Parse authors if it's a JSON string
        const asset = { ...txData.asset };
        if (asset.authors && typeof asset.authors === 'string') {
          try {
            asset.authors = JSON.parse(asset.authors);
          } catch {
            asset.authors = [asset.authors];
          }
        }

        // Save full txData including key
        this.txDetailsMap.set(txId, txData);
        this.cdr.detectChanges();
      },
      error: () => {
        this.txDetailsMap.set(txId, null);
        this.cdr.detectChanges();
      },
      complete: () => this.loadingTx.delete(txId),
    });
  }

  // Helper to check if a value is an array
  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  // Toggle a transaction's open state
  toggleTransaction(index: number, txId: string): void {
    if (this.openSet.has(index)) {
      this.openSet.delete(index);
    } else {
      this.openSet.add(index);
    }

    // Always attempt to load TX details when toggled open
    if (this.openSet.has(index)) {
      this.loadTxDetails(txId);
    }
  }

  // Check if a transaction is open
  isTransactionOpen(index: number): boolean {
    return this.openSet.has(index);
  }

  // Copy text to clipboard with feedback
  copy(value: string) {
    navigator.clipboard.writeText(value);

    this.copied = value;

    setTimeout(() => {
      this.copied = null;
      this.cdr.detectChanges();
    }, 1000);
  }

  // Navigate to previous block
  goToPreviousBlock() {
    if (this.block && parseInt(this.block.number) > 0) {
      this.router.navigate(['/block', parseInt(this.block.number) - 1]);
    }
  }

  // Navigate to next block
  goToNextBlock() {
    if (this.block && parseInt(this.block.number) < this.latestBlockNumber) {
      this.router.navigate(['/block', parseInt(this.block.number) + 1]);
    }
  }
}
