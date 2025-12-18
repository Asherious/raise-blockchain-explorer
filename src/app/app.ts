import { Component, signal, effect, HostBinding, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './app.html',
  standalone: true,
  styleUrls: ['./app.css'],
})
export class App {
  title = 'Raise Blockchain Explorer';
  // Search Bar Functionality
  private router = inject(Router);

  onSearch(val: string) {
    const id = val.trim();
    if (id) {
      this.router.navigate(['block-details', id]);
    }
  }
  // Dark Mode Toggle
  darkMode = signal<boolean>(false);

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('theme');
        this.darkMode.set(saved === 'dark');
      } catch {}

      effect(() => {
        const isDark = this.darkMode();
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', isDark);
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
