import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BlockService } from '../block.service';
import { BlockData } from '../block-data';
import { TruncateHashPipe } from '../truncate.pipe';

@Component({
  selector: 'app-block-details',
  standalone: true,
  imports: [CommonModule, TruncateHashPipe],
  templateUrl: './block-details.html',
  styleUrls: ['./block-details.css'],
})
export class BlockDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private blockService = inject(BlockService);

  block?: BlockData;
  loading = false;
  error: string | null = null;

  // Track multiple open transactions
  openSet = new Set<number>();

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const blockId = String(params['blockId']);
      this.loadBlock(blockId);
    });
  }

  private loadBlock(blockId: string): void {
    this.error = null;
    this.loading = true;
    this.blockService.getBlockById(blockId).subscribe({
      next: (data) => {
        console.log('Block data received:', data);
        this.block = data.data || data;
        this.loading = false;
      },
      error: (err) => {
        console.log('Error loading block:', err);
        this.block = undefined;
        this.error = 'Failed to load block details.';
        this.loading = false;
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
}
