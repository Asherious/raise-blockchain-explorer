import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  block?: any;
  loading = false;
  error: string | null = null;
  txDetailsMap = new Map<string, any>();
  loadingTx = new Set<string>();
  openSet = new Set<number>();
  latestBlockNumber = 0;

  // Track how the block was loaded
  searchedId: string = '';
  loadMethod: 'number' | 'hash' | 'txid' | 'key' = 'number';

  private routeSub?: Subscription;
  // Subscribe to route params
  ngOnInit() {
    // Try to get cached latest block number first
    this.latestBlockNumber = this.appService.getLatestBlockNumber();

    // Also subscribe to updates
    this.appService.getLatestBlockNumberObservable().subscribe((num) => {
      if (num > 0) {
        this.latestBlockNumber = num;
        this.cdr.detectChanges();
      }
    });

    // Fetch latest block number with caching - don't force refresh every time
    this.appService.fetchLatestBlockNumber().subscribe({
      next: (num: number) => {
        if (num > 0) {
          this.latestBlockNumber = num;
        }
      },
    });

    this.routeSub = this.route.paramMap.subscribe(async (paramMap) => {
      const id = paramMap.get('blockNumber') ?? '';
      if (!id) return;

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
    this.block = undefined;
    this.openSet.clear();
    this.txDetailsMap.clear();
    this.loadingTx.clear();

    // Determine search type first to optimize lookup
    const searchType = this.determineSearchType(id);

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

    // If not found in cache, try API calls in order of likelihood
    const attempts = [
      { type: 'number' as const, call: () => this.appService.getBlockByNumber(id) },
      { type: 'hash' as const, call: () => this.appService.getBlockByDataHash(id) },
      { type: 'hash' as const, call: () => this.appService.getBlockByCurrentBlockHash(id) },
      { type: 'hash' as const, call: () => this.appService.getPreviousBlockHash(id) },
      { type: 'txid' as const, call: () => this.appService.getBlockByTxId(id) },
      { type: 'key' as const, call: () => this.appService.getBlockByKey(id) },
    ];

    try {
      let found = false;
      let foundTxId: string | null = null;

      for (const attempt of attempts) {
        try {
          let data = await firstValueFrom(attempt.call());

          // Special handling for key search: getBlockByKey returns a txId, need to find the block
          if (attempt.type === 'key' && data) {
            foundTxId = data; // Save the txId found by key search
            data = await firstValueFrom(this.appService.getBlockByTxId(data));
          } else if (attempt.type === 'txid') {
            foundTxId = this.searchedId;
          }

          if (data?.number) {
            this.loadMethod = attempt.type;
            this.block = data;
            this.openSet.clear();

            if (attempt.type === 'txid' || attempt.type === 'key') {
              const txIdToFind = foundTxId || this.searchedId;
              const index = this.block.txIds?.indexOf(txIdToFind);
              if (index !== undefined && index !== -1) {
                this.openSet.add(index);
                this.loadTxDetails(txIdToFind);
              }
            }
            found = true;
            break;
          }
        } catch (innerErr) {
          console.error(`Failed to load block by ${attempt.type}:`, innerErr);
        }
      }

      if (!found) {
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
