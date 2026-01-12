import { Component, inject, OnInit, ChangeDetectorRef, NgZone, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BlockService } from '../block.service';
import { FormatDatePipe } from '../format-date.pipe';

@Component({
  selector: 'app-block-details',
  standalone: true,
  imports: [CommonModule, FormatDatePipe],
  templateUrl: './block-details.html',
  styleUrls: ['./block-details.css'],
})
export class BlockDetails implements OnInit {
  copied: string | null = null;

  private route = inject(ActivatedRoute);
  private blockService = inject(BlockService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  block?: any;
  loading = false;
  error: string | null = null;

  // Track multiple open transactions
  openSet = new Set<number>();

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const blockNumber = String(params['blockNumber']);
      if (!isNaN(Number(blockNumber))) {
        this.loadBlockByNumber(blockNumber);
      } else {
        this.loadBlockByDataHash(blockNumber);
      }
    });
  }

  private loadBlockByNumber(blockNumber: string): void {
    this.error = null;
    this.loading = true;

    this.blockService.getBlockByNumber(blockNumber).subscribe({
      next: (data) => {
        if (!data || !data.number) {
          this.block = null;
        } else {
          this.block = data;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load block';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadBlockByDataHash(dataHash: string): void {
    this.error = null;
    this.loading = true;

    this.blockService.getBlockByDataHash(dataHash).subscribe({
      next: (data) => {
        if (!data || !data.number) {
          this.block = null;
        } else {
          this.block = data;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load block';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Helper to check if a value is an array
  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  // Toggle a transaction's open state
  toggleTransaction(index: number): void {
    if (this.openSet.has(index)) {
      this.openSet.delete(index);
    } else {
      this.openSet.add(index);
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
    }, 500);
  }
}
