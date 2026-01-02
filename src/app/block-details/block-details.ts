import { Component, inject, OnInit, ChangeDetectorRef, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BlockService } from '../block.service';
import { TruncateHashPipe } from '../truncate.pipe';

@Component({
  selector: 'app-block-details',
  standalone: true,
  imports: [CommonModule, TruncateHashPipe],
  templateUrl: './block-details.html',
  styleUrls: ['./block-details.css'],
})
export class BlockDetails implements OnInit {
  textToCopy: string = '';
  copied: boolean = false;

  private route = inject(ActivatedRoute);
  private blockService = inject(BlockService);
  private cdr = inject(ChangeDetectorRef);

  block?: any;
  loading = false;
  error: string | null = null;

  // Track multiple open transactions
  openSet = new Set<number>();

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const blockNumber = String(params['blockNumber']);
      this.loadBlock(blockNumber);
    });
  }

  private loadBlock(blockNumber: string): void {
    this.error = null;
    this.loading = true;

    this.blockService.getBlockByNumber(blockNumber).subscribe({
      next: (data) => {
        this.block = data.data || data;
        this.loading = false; // update first
        this.cdr.detectChanges(); // then detect changes
      },
      error: (err) => {
        this.error = 'Failed to load block';
        this.loading = false;
        this.cdr.detectChanges();
        console.error(err);
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

  copyText() {
    navigator.clipboard.writeText(this.textToCopy).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }
  copy(value: string) {
    navigator.clipboard.writeText(value);
  }
}
