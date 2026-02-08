import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnInit,
  Inject,
  inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormatDatePipe } from '../format-date.pipe';
import 'chartjs-adapter-date-fns';
// Import Chart.js components
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  TimeSeriesScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { environment } from '../../environment/environment';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  TimeSeriesScale,
  Title,
  Tooltip,
  Legend,
  Filler,
);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormatDatePipe],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DASHBOARD implements OnInit, AfterViewInit {
  // X-axis tick placeholders
  ticks = Array.from({ length: 9 });

  // Inject HttpClient for API calls
  private http: HttpClient = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  error: string | null = null;

  nodeList: any[] = [];
  blockList: any[] = [];
  chaincodeList: any[] = [];

  get totalTransactions(): number {
    return this.blockList.reduce((sum, block) => sum + block.txCount, 0);
  }

  // ViewChild references for the chart canvases
  @ViewChild('blockChartCanvas') blockChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('txChartCanvas') txChartRef!: ElementRef<HTMLCanvasElement>;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchBlockData();
      this.fetchNodeData();
      this.fetchChaincodeData();
    }
  }
  // Fetch block data from API
  fetchBlockData() {
    this.http.get<any[]>(`${environment.apiURL}/blocks`).subscribe({
      next: (data) => {
        this.blockList = data;
        // Sorting blocks
        this.blockList.sort((a, b) => parseInt(b.number) - parseInt(a.number));
        setTimeout(() => {
          this.initBlockChart();
          this.initTransactionChart();
          this.cdr.detectChanges();
        }, 0);
      },
    });
  }
  //Fetch node data from API
  fetchNodeData() {
    this.http.get<any[]>(`${environment.apiURL}/channelnodes`).subscribe({
      next: (data) => {
        this.nodeList = data;
        this.cdr.detectChanges();
      },
    });
  }
  //Fetch chaincode data from API
  fetchChaincodeData() {
    this.http.get<any[]>(`${environment.apiURL}/chaincodes`).subscribe({
      next: (data) => {
        this.chaincodeList = data;
        this.cdr.detectChanges();
      },
    });
  }

  initChartsAfterData() {
    if (isPlatformBrowser(this.platformId)) {
      // Ensure DOM is ready
      setTimeout(() => {
        this.cdr.detectChanges(); // <-- ensures ViewChild exists
        if (this.blockList.length > 0) {
          this.initBlockChart();
          this.initTransactionChart();
        }
      }, 0);
    }
  }

  // Inject PLATFORM_ID to check if running in browser
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit(): void {}

  // Method for Block Chart
  initBlockChart() {
    if (!this.blockChartRef || !this.blockChartRef.nativeElement) {
      console.error('Block Chart Canvas not found or not ready.');
      return;
    }
    const isDark = document.documentElement.classList.contains('dark');

    const aggregatedData = this.getAggregatedBlocksPerHour();

    const ctx = this.blockChartRef.nativeElement;
    ctx.style.width = '100%';
    ctx.style.height = '100%';
    Chart.getChart(ctx)?.destroy();

    const gradientblockFill = ctx.getContext('2d')!.createLinearGradient(0, 0, 0, 400);
    gradientblockFill.addColorStop(0, '#004491');
    gradientblockFill.addColorStop(0.55, '#006391');
    gradientblockFill.addColorStop(1, '#008691');

    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Blocks',
            data: aggregatedData,
            backgroundColor: gradientblockFill,
            tension: 0.2,
            borderWidth: 0,
            pointRadius: 0,
            pointHitRadius: 10,
            fill: 'origin',
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: 10,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function (tooltipItems: any) {
                if (tooltipItems.length > 0) {
                  const date = tooltipItems[0].parsed.x;
                  return new Intl.DateTimeFormat('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }).format(date);
                }
                return '';
              },
              label: function (context: any) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y;
                }
                return label;
              },
            },
          },
        },
        interaction: {
          intersect: false,
        },
        scales: {
          x: {
            type: 'time',
            display: false,
            time: { unit: 'minute', displayFormats: { minute: 'HH:mm' } },
            ticks: { source: 'auto', major: { enabled: true } },
          },
          y: {
            display: true,
            min: 0,
            suggestedMax: 100,
            border: {
              width: 0,
            },
            grid: {
              display: false,
            },
            ticks: {
              font: {
                family: 'Poppins, sans-serif',
                weight: 'bolder',
                size: 12,
              },
              stepSize: 10,
              callback: function (value: any) {
                return value === 0 ? '' : value;
              },
            },
          },
        },
      },
    });
  }

  // Method for Transactions Chart
  initTransactionChart() {
    if (!this.txChartRef || !this.txChartRef.nativeElement) {
      console.error('Transaction Chart Canvas not found or not ready.');
      return;
    }

    const aggregatedData = this.getAggregatedTxPerHour();

    const ctx = this.txChartRef.nativeElement;
    ctx.style.width = '100%';
    ctx.style.height = '100%';
    Chart.getChart(ctx)?.destroy();

    const gradienttxFill = ctx.getContext('2d')!.createLinearGradient(0, 0, 0, 400);
    gradienttxFill.addColorStop(0, '#ed2b2b');
    gradienttxFill.addColorStop(0.55, '#eb5d5d');
    gradienttxFill.addColorStop(1, '#eb5d82');

    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Transactions',
            data: aggregatedData,
            backgroundColor: gradienttxFill,
            tension: 0.2,
            borderWidth: 0,
            pointRadius: 0,
            pointHitRadius: 10,
            fill: 'origin',
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: 10,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function (tooltipItems: any) {
                if (tooltipItems.length > 0) {
                  const date = tooltipItems[0].parsed.x;
                  return new Intl.DateTimeFormat('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }).format(date);
                }
                return '';
              },
              label: function (context: any) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y;
                }
                return label;
              },
            },
          },
        },
        interaction: {
          intersect: false,
        },
        scales: {
          x: {
            type: 'time',
            display: false,
            time: { unit: 'hour', displayFormats: { hour: 'HH:mm' } },
            ticks: { source: 'auto', major: { enabled: true } },
          },
          y: {
            display: true,
            min: 0,
            suggestedMax: 100,
            border: {
              width: 0,
            },
            grid: {
              display: false,
            },
            ticks: {
              font: {
                family: 'Poppins, sans-serif',
                weight: 'bolder',
              },
              stepSize: 10,
              callback: function (value: any) {
                return value === 0 ? '' : value;
              },
            },
          },
        },
      },
    });
  }
  // Block and Transaction aggregation methods
  getAggregatedBlocksPerHour() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    const hourlyBins: { [key: number]: { count: number; latestTs: number } } = {};

    for (let i = 24; i >= 0; i--) {
      const startOfHour = new Date(now - i * oneHour);
      startOfHour.setMinutes(0, 0, 0);
      hourlyBins[startOfHour.getTime()] = {
        count: 0,
        latestTs: startOfHour.getTime(),
      };
    }

    this.blockList.forEach((block) => {
      const blockTs = new Date(block.timestamp).getTime();

      if (blockTs >= now - 24 * oneHour && blockTs <= now) {
        const blockDate = new Date(blockTs);
        blockDate.setMinutes(0, 0, 0);
        const key = blockDate.getTime();

        if (hourlyBins[key]) {
          hourlyBins[key].count++;
          if (blockTs > hourlyBins[key].latestTs) {
            hourlyBins[key].latestTs = blockTs;
          }
        }
      }
    });

    /* 🔥 ADD 30 FAKE ENTRIES HERE */
    /*for (let i = 1; i <= 50; i++) {
      const fakeHour = new Date(now - (24 + i) * oneHour);
      fakeHour.setMinutes(0, 0, 0);

      const fakeKey = fakeHour.getTime();

      if (!hourlyBins[fakeKey]) {
        hourlyBins[fakeKey] = {
          count: Math.floor(Math.random() * 100) + 1, // fake block count
          latestTs: fakeKey,
        };
      }
    }*/

    return Object.keys(hourlyBins)
      .sort((a, b) => Number(a) - Number(b))
      .map((timestampStr) => {
        const hourBin = hourlyBins[Number(timestampStr)];
        return {
          x: new Date(hourBin.latestTs),
          y: hourBin.count,
        };
      });
  }

  getAggregatedTxPerHour() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    const hourlyBins: { [key: number]: { txCount: number; latestTs: number } } = {};
    for (let i = 24; i >= 0; i--) {
      const startOfHour = new Date(now - i * oneHour);
      startOfHour.setMinutes(0, 0, 0);
      hourlyBins[startOfHour.getTime()] = { txCount: 0, latestTs: startOfHour.getTime() };
    }

    this.blockList.forEach((block) => {
      const blockTs = new Date(block.timestamp).getTime();

      if (blockTs >= now - 24 * oneHour && blockTs <= now) {
        const blockDate = new Date(blockTs);
        blockDate.setMinutes(0, 0, 0);
        const key = blockDate.getTime();

        if (hourlyBins.hasOwnProperty(key)) {
          hourlyBins[key].txCount += block.txCount;
          if (blockTs > hourlyBins[key].latestTs) {
            hourlyBins[key].latestTs = blockTs;
          }
        }
      }
    });

    return Object.keys(hourlyBins)
      .sort((a, b) => Number(a) - Number(b))
      .map((timestampStr) => {
        const hourBin = hourlyBins[Number(timestampStr)];
        return { x: new Date(hourBin.latestTs), y: hourBin.txCount };
      });
  }
}
