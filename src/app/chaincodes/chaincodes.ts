import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler);

@Component({
  selector: 'app-chaincodes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chaincodes.html',
  styleUrls: ['./chaincodes.css'],
})
export class CHAINCODES implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('balanceChartCanvas')
  balanceChartRef!: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;

  error: string | null = null;
  chaincodeList: any[] = [];

  ngOnInit(): void {
    this.fetchChaincodeData();
  }

  fetchChaincodeData(): void {
    this.http.get<any[]>('http://localhost:3000/chaincodes').subscribe({
      next: (data) => {
        this.chaincodeList = data;
        this.error = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to fetch chaincode data';
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }
}
