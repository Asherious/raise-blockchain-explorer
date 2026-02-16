import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BlockService } from '../block.service';
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
  private blockService = inject(BlockService);
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
    // Fetch latest block number
    this.blockService.getAllBlocks().subscribe({
      next: (blocks: any[]) => {
        if (blocks && blocks.length > 0) {
          this.latestBlockNumber = Math.max(...blocks.map((b) => parseInt(b.number)));
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

  // Attempt to load block by number, then hash, then txid
  private async tryLoadBlock(id: string): Promise<void> {
    this.loading = true;
    this.error = null;
    this.block = undefined;
    this.openSet.clear();
    this.txDetailsMap.clear();
    this.loadingTx.clear();

    const attempts = [
      { type: 'number' as const, call: () => this.blockService.getBlockByNumber(id) },
      { type: 'hash' as const, call: () => this.blockService.getBlockByDataHash(id) },
      { type: 'hash' as const, call: () => this.blockService.getBlockByCurrentBlockHash(id) },
      { type: 'hash' as const, call: () => this.blockService.getPreviousBlockHash(id) },
      { type: 'txid' as const, call: () => this.blockService.getBlockByTxId(id) },
      { type: 'key' as const, call: () => this.blockService.getBlockByKey(id) },
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
            data = await firstValueFrom(this.blockService.getBlockByTxId(data));
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

    this.blockService.getBlockTxDetails(txId).subscribe({
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
