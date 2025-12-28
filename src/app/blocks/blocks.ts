import {
  Component,
  ElementRef,
  ViewChild,
  HostListener,
  inject,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TruncateHashPipe } from '../truncate.pipe';
import { BlockService } from '../block.service';
import { BlockData } from '../block-data';

@Component({
  selector: 'app-blocks',
  standalone: true,
  imports: [CommonModule, RouterLink, TruncateHashPipe],
  templateUrl: './blocks.html',
  styleUrls: ['./blocks.css'],
})
export class BLOCKS implements OnInit, AfterViewInit {
  // API + BlockService
  private blockService: BlockService = inject(BlockService);

  // Full block list and paginated view
  paginatedBlockList: BlockData[] = [];

  // Pagination
  pageSize: number = 10;
  currentPage: number = 1;
  totalPages: number = 0;

  // Loading and error states
  loading = true;
  error: string | null = null;

  // Drag-to-scroll
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  private isDragging = false;
  private startX = 0;
  private scrollLeft = 0;

  // Track open/closed state for transactions
  openTx: boolean[] = [];

  // Lifecycle hooks
  ngOnInit(): void {
    this.fetchBlockData();
  }

  ngAfterViewInit(): void {
    // Scroll container is now available
  }

  // Fetch block data from API
  fetchBlockData() {
    this.loading = true;
    this.blockService.getAllBlocks().subscribe({
      next: (data) => {
        this.blockList = data;
        this.openTx = data.map(() => false); // initialize TX expand state
        this.calculatePaginationDetails();
        this.updatePaginatedList();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching block data:', err);
        this.error = 'Failed to load blocks';
        this.loading = false;
      },
    });
  }

  // Toggle individual transaction visibility
  toggleTx(index: number) {
    this.openTx[index] = !this.openTx[index];
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(e: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.scrollContainer.nativeElement.classList.remove('cursor-grabbing');
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.scrollContainer) return;
    e.preventDefault();
    const x = e.pageX - this.scrollContainer.nativeElement.offsetLeft;
    const walk = (x - this.startX) * 1;
    this.scrollContainer.nativeElement.scrollLeft = this.scrollLeft - walk;
  }
  // Pagination functionality
  constructor() {
    this.calculatePaginationDetails();
    this.updatePaginatedList();
  }
  // Mouse down event to initiate dragging
  onMouseDown(e: MouseEvent): void {
    if (!this.scrollContainer) return;
    this.isDragging = true;
    this.scrollContainer.nativeElement.classList.add('cursor-grabbing');
    this.startX = e.pageX - this.scrollContainer.nativeElement.offsetLeft;
    this.scrollLeft = this.scrollContainer.nativeElement.scrollLeft;
  }
  // Pagination methods
  calculatePaginationDetails(): void {
    this.totalPages = Math.ceil(this.blockList.length / this.pageSize);
  }
  // Update the paginated list based on current page and page size
  updatePaginatedList(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedBlockList = this.blockList.slice(startIndex, endIndex);
  }
  // Navigate to a specific page
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedList();
    }
  }
  // Navigate to next page
  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }
  // Navigate to previous page
  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  // Mock Block Data
  blockList: BlockData[] = [];
}
