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
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DASHBOARD implements OnInit, AfterViewInit {
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
    this.http.get<any[]>('http://localhost:3000/blocks').subscribe({
      next: (data) => {
        this.blockList = data;
        // Sorting blocks
        this.blockList.sort((a, b) => parseInt(b.number) - parseInt(a.number));
        setTimeout(() => {
          this.initBlockChart();
          this.initTransactionChart();
        }, 0);
      },
      error: (err) => {
        this.error = 'Failed to fetch blocks';
      },
    });
  }
  //Fetch node data from API
  fetchNodeData() {
    this.http.get<any[]>('http://localhost:3000/nodes').subscribe({
      next: (data) => {
        this.nodeList = data;
        this.cdr.detectChanges();
      },
    });
  }
  //Fetch chaincode data from API
  fetchChaincodeData() {
    this.http.get<any[]>('http://localhost:3000/chaincodes').subscribe({
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
    const ctx = this.blockChartRef.nativeElement;
    const aggregatedData = this.getAggregatedBlocksPerHour();

    const bufferMs = 5 * 60 * 1000;
    const nowBuffered = new Date(Date.now() + bufferMs).toISOString();
    const twentyFourHoursAgoBuffered = new Date(
      Date.now() - 24 * 60 * 60 * 1000 - bufferMs,
    ).toISOString();

    const gradientblockFill = ctx.getContext('2d')!.createLinearGradient(0, 0, 0, 220);
    gradientblockFill.addColorStop(0, 'rgba(57, 109, 187, 1)');
    gradientblockFill.addColorStop(1, 'rgba(57, 109, 187,0)');

    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Blocks',
            data: aggregatedData,
            borderColor: '#396dbb',
            backgroundColor: gradientblockFill,
            tension: 0.2,
            borderWidth: 3,
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
        layout: { padding: { left: 10, right: 10 } },
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
                    hour12: true,
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
        scales: {
          x: {
            type: 'time',
            display: false,
            min: twentyFourHoursAgoBuffered,
            max: nowBuffered,
            time: { unit: 'hour', displayFormats: { hour: 'HH:mm' } },
            ticks: { source: 'auto', major: { enabled: true } },
          },
          y: {
            display: true,
            beginAtZero: true,
            ticks: { stepSize: 2 },
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
    const ctx = this.txChartRef.nativeElement;
    const aggregatedData = this.getAggregatedTxPerHour();

    const bufferMs = 5 * 60 * 1000;
    const nowBuffered = new Date(Date.now() + bufferMs).toISOString();
    const twentyFourHoursAgoBuffered = new Date(
      Date.now() - 24 * 60 * 60 * 1000 - bufferMs,
    ).toISOString();

    const gradienttxFill = ctx.getContext('2d')!.createLinearGradient(0, 0, 0, 220);
    gradienttxFill.addColorStop(0, 'rgba(101, 174, 97, 1)');
    gradienttxFill.addColorStop(1, 'rgba(101, 174, 97, 0)');

    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Transactions',
            data: aggregatedData,
            borderColor: '#65ae61',
            backgroundColor: gradienttxFill,
            tension: 0.2,
            borderWidth: 3,
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
        layout: { padding: { left: 10, right: 10 } },
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
                    hour12: true,
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
        scales: {
          x: {
            type: 'time',
            display: false,
            min: twentyFourHoursAgoBuffered,
            max: nowBuffered,
            time: { unit: 'hour', displayFormats: { hour: 'HH:mm' } },
            ticks: { source: 'auto', major: { enabled: true } },
          },
          y: {
            display: true,
            beginAtZero: true,
            ticks: { stepSize: 2 },
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
      hourlyBins[startOfHour.getTime()] = { count: 0, latestTs: startOfHour.getTime() };
    }

    this.blockList.forEach((block) => {
      const blockTs = new Date(block.timestamp).getTime();

      if (blockTs >= now - 24 * oneHour && blockTs <= now) {
        const blockDate = new Date(blockTs);
        blockDate.setMinutes(0, 0, 0);
        const key = blockDate.getTime();

        if (hourlyBins.hasOwnProperty(key)) {
          hourlyBins[key].count++;
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
        return { x: new Date(hourBin.latestTs), y: hourBin.count };
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
