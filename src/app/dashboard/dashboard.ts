import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnInit,
  Inject,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PeerData } from '../peer-data';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BlockData } from '../block-data';
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

  loading = true;
  error: string | null = null;
  blockList: BlockData[] = [];

  // ViewChild references for the chart canvases
  @ViewChild('blockChartCanvas') blockChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('txChartCanvas') txChartRef!: ElementRef<HTMLCanvasElement>;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchBlockData();
    }
  }
  // Fetch block data from API
  fetchBlockData() {
    this.loading = true;
    this.http.get<BlockData[]>('http://localhost:3000/blocks').subscribe({
      next: (data) => {
        this.blockList = data;
        this.blockList.sort((a, b) => parseInt(b.number) - parseInt(a.number));
        this.loading = false;
        this.initChartsAfterData(); // safe: only runs in browser
      },
      error: (err) => {
        console.error('Error fetching blocks:', err);
        this.loading = false;
      },
    });
  }

  initChartsAfterData() {
    if (isPlatformBrowser(this.platformId)) {
      // Ensure DOM is ready
      setTimeout(() => {
        if (this.blockList.length > 0) {
          this.initBlockChart();
          this.initTransactionChart();
        }
      });
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
            tension: 0,
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
            tension: 0,
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
  // Mock Peer Data
  peerList: PeerData[] = [
    {
      peerName: 'peer0.org1.example.com:7051',
      status: true,
    },
    {
      peerName: 'peer0.org2.example.com:9051',
      status: true,
    },
    {
      peerName: 'orderer.example.com:7050',
      status: true,
    },
    {
      peerName: 'orderer.example.com:7050',
      status: true,
    },
    {
      peerName: 'orderer.example.com:7050',
      status: true,
    },
  ];
}
