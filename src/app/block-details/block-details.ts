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
  // State variable for expand/collapse
  open = false;

  // Dependency injections
  route: ActivatedRoute = inject(ActivatedRoute);
  blockService: BlockService = inject(BlockService);

  // Component properties
  blockId: number = 0;
  channelName: string | null = null;
  tx: number = 0;
  dataHash: string | null = null;
  blockHash: string | null = null;
  previousHash: string | null = null;
  txId: string[] | null = null;
  size: number | null = null;

  // Check if value is an array
  isArray(val: any): boolean {
    return Array.isArray(val);
  }
  // Constructor to get blockId from route parameters
  constructor() {
    this.blockId = Number(this.route.snapshot.params['blockId']);
  }

  // Block data object
  block: BlockData | undefined;

  // On component initialization
  ngOnInit(): void {
    this.getBlockData();
    this.route.params.subscribe((params) => {
      const id = Number(params['blockId']);
      this.fetchBlockData(id);
    });
  }

  // Fetch complete block data
  private fetchBlockData(id: number): void {
    this.blockService.getBlockDetails(id).subscribe({
      next: (data) => {
        this.block = data;
      },
      error: () => {
        this.block = undefined;
      },
    });
  }

  // Fetch individual block data fields
  getBlockData(): void {
    this.blockService.getBlockDetails(this.blockId).subscribe({
      next: (data) => {
        this.channelName = data ? data.channelName : 'Not Found';
      },
    });
    this.blockService.getBlockDetails(this.blockId).subscribe({
      next: (data) => {
        this.tx = Number(data ? data.tx : 'Not Found');
      },
    });
    this.blockService.getBlockDetails(this.blockId).subscribe({
      next: (data) => {
        this.dataHash = data ? data.dataHash : 'Not Found';
      },
    });
    this.blockService.getBlockDetails(this.blockId).subscribe({
      next: (data) => {
        this.blockHash = data ? data.blockHash : 'Not Found';
      },
    });
    this.blockService.getBlockDetails(this.blockId).subscribe({
      next: (data) => {
        this.previousHash = data ? data.previousHash : 'Not Found';
      },
    });
    this.blockService.getBlockDetails(this.blockId).subscribe({
      next: (data) => {
        this.txId = data ? data.txId : ['Not Found'];
      },
    });
    this.blockService.getBlockDetails(this.blockId).subscribe({
      next: (data) => {
        this.size = Number(data ? data.size : 'Not Found');
      },
    });
  }
}
