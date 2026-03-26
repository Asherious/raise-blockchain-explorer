import {
  Component,
  ElementRef,
  ViewChild,
  HostListener,
  inject,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppService } from '../app.service';
import { FormatDatePipe } from '../format-date.pipe';

@Component({
  selector: 'app-blocks',
  standalone: true,
  imports: [CommonModule, RouterLink, FormatDatePipe],
  templateUrl: './blocks.html',
  styleUrls: ['./blocks.css'],
})
export class Blocks implements OnInit, AfterViewInit {
  // X-axis tick placeholders
  ticks = Array.from({ length: 9 });
  // API + AppService
  private appService: AppService = inject(AppService);

  // Full block list and paginated view
  blockList: any[] = [];
  paginatedBlockList: any[] = [];

  // Pagination
  pageSize: number = 10;
  currentPage: number = 1;
  totalPages: number = 0;
  // Visible page numbers for numbered pagination
  visiblePages: number[] = [];
  maxVisiblePages: number = 3;
  isLoading = true;

  // Loading and error states

  error: string | null = null;

  // Drag-to-scroll
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  private isDragging = false;
  private isMouseDown = false;
  private startX = 0;
  private scrollLeft = 0;
  private dragThreshold = 5;
  private totalMovement = 0;

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
  private cdr = inject(ChangeDetectorRef);

  fetchBlockData() {
    this.appService.getAllBlocks().subscribe({
      next: (data) => {
        this.blockList = data;
        this.blockList.sort((a, b) => parseInt(b.number) - parseInt(a.number));
        //this.addRandomTransactionsToBlocks();
        this.openTx = data.map(() => false);
        this.calculatePaginationDetails();
        this.calculateVisiblePages();
        this.updatePaginatedList();
        this.cdr.detectChanges(); // Force update
      },
      error: (err) => {
        this.error = 'Failed to fetch blocks';
        this.cdr.detectChanges();
      },
      complete: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // Toggle individual transaction visibility
  toggleTx(index: number) {
    this.openTx[index] = !this.openTx[index];
  }
  // Mouse down event to initiate dragging
  onMouseDown(e: MouseEvent): void {
    if (!this.scrollContainer) return;

    this.isMouseDown = true;
    this.isDragging = false;

    const container = this.scrollContainer.nativeElement;
    this.startX = e.pageX - container.offsetLeft;
    this.scrollLeft = container.scrollLeft;
  }
  // Mouse move event for drag-to-scroll
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.isMouseDown || !this.scrollContainer) return;

    const container = this.scrollContainer.nativeElement;
    const x = e.pageX - container.offsetLeft;
    const walk = x - this.startX;

    this.totalMovement = Math.abs(walk);

    if (this.totalMovement > this.dragThreshold) {
      this.isDragging = true;
    }

    if (this.isDragging) {
      e.preventDefault();
      container.scrollLeft = this.scrollLeft - walk;
    }
  }
  // Mouse up event to end dragging
  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (!this.isMouseDown) return;

    this.isMouseDown = false;

    // Delay reset so click handler can still read movement
    // We'll reset after a longer delay to allow click event to fire first
    setTimeout(() => {
      this.isDragging = false;
      this.totalMovement = 0;
    }, 100);
  }
  // Handle click to prevent navigation when dragging
  onBlockClick(event: MouseEvent): boolean {
    if (this.isDragging || this.totalMovement > this.dragThreshold) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
    return true;
  }
  // Pagination functionality
  constructor() {
    this.calculatePaginationDetails();
    this.updatePaginatedList();
    this.calculateVisiblePages();
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
  // Calculate visible page numbers for numbered pagination
  calculateVisiblePages(): void {
    const half = Math.floor(this.maxVisiblePages / 2);
    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + this.maxVisiblePages - 1);

    // Adjust start if we're at the end
    if (end - start + 1 < this.maxVisiblePages) {
      start = Math.max(1, end - this.maxVisiblePages + 1);
    }

    this.visiblePages = [];
    for (let i = start; i <= end; i++) {
      this.visiblePages.push(i);
    }
  }

  // Navigate to a specific page
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedList();
      this.calculateVisiblePages();
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

  copy(value: string) {
    navigator.clipboard.writeText(value);
  }
}
