import {
  Component,
  signal,
  effect,
  HostBinding,
  inject,
  ChangeDetectorRef,
  PLATFORM_ID,
  Inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environment/environment';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './app.html',
  standalone: true,
  styleUrls: ['./app.scss'],
})
export class App {
  // Inject HttpClient for API calls
  private http: HttpClient = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  error: string | null = null;

  blockList: any[] = [];

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  get totalTransactions(): number {
    return this.blockList.reduce((sum, block) => sum + block.txCount, 0);
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchBlockData();
    }
  }
  // Fetch block data from API
  fetchBlockData() {
    this.http.get<any[]>(`${environment.apiURL}/blocks`).subscribe({
      next: (data) => {
        this.blockList = data;
        this.cdr.detectChanges();
      },
    });
  }

  title = 'Raise Blockchain Explorer';
  // Search Bar Functionality
  private router = inject(Router);

  onSearch(val: string) {
    const id = val.trim();
    if (id) {
      this.router.navigate(['blocks', id]);
      this.searchInput.nativeElement.value = '';
    }
  }
  // Dark Mode Toggle
  darkMode = signal<boolean>(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('theme');
        this.darkMode.set(saved === 'dark');
      } catch {}

      effect(() => {
        const isDark = this.darkMode();

        if (typeof document !== 'undefined') {
          const root = document.documentElement;

          // Disable transitions
          root.classList.add('no-transition');

          // Toggle dark mode
          root.classList.toggle('dark', isDark);

          // Re-enable transitions on next frame
          requestAnimationFrame(() => {
            root.classList.remove('no-transition');
          });
        }

        try {
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
        } catch {}
      });
    }
  }
  @HostBinding('class.dark') get mode() {
    return this.darkMode();
  }

  toggle() {
    this.darkMode.set(!this.darkMode());
  }
}
