import { Component, inject, OnInit, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AppService } from '../app.service';
import { FormatDatePipe } from '../format-date.pipe';
import { Subscription } from 'rxjs';

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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

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

  // Track previous ID to skip reloading same block
  private previousId: string = '';

  private routeSub?: Subscription;
  // Subscribe to route params
  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.latestBlockNumber = this.appService.getLatestBlockNumber();

    this.appService.getLatestBlockNumberObservable().subscribe((num) => {
      if (num > 0) {
        this.latestBlockNumber = num;
        this.cdr.detectChanges();
      }
    });

    this.appService.fetchLatestBlockNumber().subscribe({
      next: (num: number) => {
        if (num > 0) this.latestBlockNumber = num;
      },
    });

    // 🔥 IMPORTANT: ensure cache is loaded first
    if (!this.appService.hasBlocksCache()) {
      await firstValueFrom(this.appService.getAllBlocks());
    }

    // THEN subscribe to route
    this.routeSub = this.route.paramMap.subscribe(async (paramMap) => {
      const id = paramMap.get('blockNumber') ?? '';

      if (id === this.previousId && this.block) {
        return;
      }
      if (!id) return;

      this.previousId = id;
      this.searchedId = id;

      await this.tryLoadBlock(id);
    });
  }
  // Cleanup subscription
  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  // Determine the likely search type from the input format
  private determineSearchType(id: string): 'number' | 'hash' | 'txid' | 'key' | 'unknown' {
    // Check if it's a number
    if (/^\d+$/.test(id)) {
      return 'number';
    }
    // Check if it looks like a hex hash (64 chars for SHA-256)
    if (/^[a-fA-F0-9]{64}$/.test(id)) {
      return 'hash';
    }
    // Could be txid or key - these are typically longer hex strings
    if (/^[a-fA-F0-9]+$/.test(id)) {
      return 'txid';
    }
    return 'unknown';
  }

  // Attempt to load block - optimized to use cache first
  private async tryLoadBlock(id: string): Promise<void> {
    this.loading = true;
    this.error = null;
    this.block = null;
    this.openSet.clear();
    this.txDetailsMap.clear();
    this.loadingTx.clear();

    // Determine search type first to optimize lookup
    let searchType = this.determineSearchType(id);

    // Try cache-first approach
    const cachedResult = this.appService.searchBlock(id);

    if (cachedResult.block) {
      this.loadMethod = cachedResult.type || 'number';
      this.block = cachedResult.block;
      this.loading = false;

      // If searching by txid or key, auto-expand the relevant transaction
      if (searchType === 'txid' || cachedResult.type === 'txid') {
        const txIdToFind = this.searchedId;
        const index = this.block.txIds?.indexOf(txIdToFind);
        if (index !== undefined && index !== -1) {
          this.openSet.add(index);
          this.loadTxDetails(txIdToFind);
        }
      }

      this.cdr.detectChanges();
      return;
    }

    const keyResult = await firstValueFrom(this.appService.searchBlockByKey(id));
    if (keyResult.block) {
      this.loadMethod = 'key';
      this.block = keyResult.block;
      this.loading = false;
      // Auto-expand the transaction for key search
      // First get the txId from the key, then find it in the block
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

    let data = null;

    try {
      switch (searchType) {
        case 'number':
          data = await firstValueFrom(this.appService.getBlockByNumber(id));
          this.loadMethod = 'number';
          break;
        case 'hash':
          // Try data hash first, then current block hash in parallel
          const [byDataHash, byCurrentHash, byPreviousHash] = await Promise.all([
            firstValueFrom(this.appService.getBlockByDataHash(id)),
            firstValueFrom(this.appService.getBlockByCurrentBlockHash(id)),
            firstValueFrom(this.appService.getBlockByPreviousBlockHash(id)),
          ]);
          data = byDataHash || byCurrentHash || byPreviousHash;
          this.loadMethod = 'hash';
          break;
        case 'txid':
          data = await firstValueFrom(this.appService.getBlockByTxId(id));
          if (!data?.number) {
            const txIdFromKey = await firstValueFrom(this.appService.getBlockByKey(id));
            if (txIdFromKey) {
              data = await firstValueFrom(this.appService.getBlockByTxId(txIdFromKey));
              searchType = 'key'; // Update searchType for auto-expand logic
            }
          }
          this.loadMethod = 'txid';
          break;
        case 'key':
          const txId = await firstValueFrom(this.appService.getBlockByKey(id));
          if (txId) {
            data = await firstValueFrom(this.appService.getBlockByTxId(txId));
          }
          this.loadMethod = 'key';
          break;
        default:
          // For unknown types, try number first then hash
          data = await firstValueFrom(this.appService.getBlockByNumber(id));
          if (!data?.number) {
            const [byDataHash, byCurrentHash] = await Promise.all([
              firstValueFrom(this.appService.getBlockByDataHash(id)),
              firstValueFrom(this.appService.getBlockByCurrentBlockHash(id)),
            ]);
            data = byDataHash || byCurrentHash;
          }
          break;
      }

      if (data?.number) {
        this.block = data;
        this.openSet.clear();

        // Auto-expand the relevant transaction for txid/key searches
        if (searchType === 'txid') {
          const txIdToFind =
            searchType === 'txid'
              ? this.searchedId
              : await firstValueFrom(this.appService.getBlockByKey(this.searchedId));
          const index = this.block.txIds?.indexOf(txIdToFind);
          if (index !== undefined && index !== -1) {
            this.openSet.add(index);
            this.loadTxDetails(txIdToFind);
          }
        }
      } else {
        this.block = null;
        this.loadingTx.clear();
        this.openSet.clear();
        this.txDetailsMap.clear();
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
      this.router.navigate(['/blocks', parseInt(this.block.number) - 1]);
    }
  }

  // Navigate to next block
  goToNextBlock() {
    if (this.block && parseInt(this.block.number) < this.latestBlockNumber) {
      this.router.navigate(['/blocks', parseInt(this.block.number) + 1]);
    }
  }
}
