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
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
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
import { before } from 'node:test';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DASHBOARD implements OnInit, AfterViewInit, OnDestroy {
  // X-axis tick placeholders
  ticks = Array.from({ length: 9 });

  // Inject HttpClient for API calls
  private http: HttpClient = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  private themeObserver: MutationObserver | null = null;
  private isDarkMode: boolean = false;

  error: string | null = null;
  isLoading: boolean = true;

  nodeList: any[] = [];
  blockList: any[] = [];
  chaincodeList: any[] = [];

  get displayedBlocks(): any[] {
    return this.blockList;
  }

  get totalTransactions(): number {
    return this.blockList.reduce((sum, block) => sum + block.txCount, 0);
  }

  // ViewChild references for the chart canvases
  @ViewChild('blockChartCanvas') blockChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('txChartCanvas') txChartRef!: ElementRef<HTMLCanvasElement>;

  private blockChart: any = null;
  private txChart: any = null;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchAllData();
    }
  }

  // Fetch all data in parallel using forkJoin
  fetchAllData() {
    this.isLoading = true;

    forkJoin({
      blocks: this.http.get<any[]>(`${environment.apiURL}/blocks`),
      nodes: this.http.get<any[]>(`${environment.apiURL}/nodes`),
    }).subscribe({
      next: (data) => {
        // Process blocks - sort and store
        this.blockList = data.blocks.sort((a, b) => parseInt(b.number) - parseInt(a.number));

        // Store node and chaincode data
        this.nodeList = data.nodes;

        this.isLoading = false;
        this.cdr.markForCheck();

        // Initialize charts after data is loaded
        this.initBlockChart();
        this.initTransactionChart();
      },
      error: (err) => {
        this.error = 'Failed to load dashboard data';
        this.isLoading = false;
        this.cdr.markForCheck();
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

  ngAfterViewInit(): void {
    this.initThemeObserver();
  }

  ngOnDestroy(): void {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }

  private initThemeObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Initialize current theme state
    this.isDarkMode = document.documentElement.classList.contains('dark');

    this.themeObserver = new MutationObserver(() => {
      this.isDarkMode = document.documentElement.classList.contains('dark');
      this.updateChartsTheme();
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  private updateChartsTheme(): void {
    // Trigger chart updates with the new theme
    if (this.blockChart) {
      this.blockChart.update('none');
    }
    if (this.txChart) {
      this.txChart.update('none');
    }
  }

  // Method for Block Chart
  initBlockChart() {
    if (!this.blockChartRef || !this.blockChartRef.nativeElement) {
      console.error('Block Chart Canvas not found or not ready.');
      return;
    }
    // Update current theme state
    this.isDarkMode = document.documentElement.classList.contains('dark');

    const aggregatedData = this.getAggregatedBlocksPerHour();

    const ctx = this.blockChartRef.nativeElement;
    ctx.style.width = '100%';
    ctx.style.height = '100%';
    Chart.getChart(ctx)?.destroy();

    const gradientblockFill = ctx.getContext('2d')!.createLinearGradient(0, 0, 0, 400);
    gradientblockFill.addColorStop(0, '#004491');
    gradientblockFill.addColorStop(0.55, '#006391');
    gradientblockFill.addColorStop(1, '#008691');

    // Store reference to this class for the plugin
    const dashboardComponent = this;

    //backgroundFill - uses class property for dynamic theme
    const backgroundFill = {
      id: 'backgroundFill',
      beforeDraw(chart: {
        ctx: CanvasRenderingContext2D;
        chartArea: { top: number; left: number; width: number; height: number };
      }) {
        const ctx = chart.ctx;
        const { top, left, width, height } = chart.chartArea;
        const radius = 15;
        const shadowSize = 8;
        const isDarkMode = dashboardComponent.isDarkMode;

        const bgColor = isDarkMode ? '#24272C' : '#e0e4e7';
        const darkShadow = isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)';
        const lightShadow = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)';

        ctx.save();

        // Rounded rectangle path
        ctx.beginPath();
        ctx.moveTo(left + radius, top);
        ctx.lineTo(left + width - radius, top);
        ctx.quadraticCurveTo(left + width, top, left + width, top + radius);
        ctx.lineTo(left + width, top + height - radius);
        ctx.quadraticCurveTo(left + width, top + height, left + width - radius, top + height);
        ctx.lineTo(left + radius, top + height);
        ctx.quadraticCurveTo(left, top + height, left, top + height - radius);
        ctx.lineTo(left, top + radius);
        ctx.quadraticCurveTo(left, top, left + radius, top);
        ctx.closePath();

        // Fill the background
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Clip to the rounded rectangle to make shadows respect corners
        ctx.save();
        ctx.clip();

        // Top shadow
        let grad = ctx.createLinearGradient(0, top, 0, top + shadowSize);
        grad.addColorStop(0, darkShadow);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(left, top, width, shadowSize);

        // Bottom shadow
        grad = ctx.createLinearGradient(0, top + height - shadowSize, 0, top + height);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, lightShadow);
        ctx.fillStyle = grad;
        ctx.fillRect(left, top + height - shadowSize, width, shadowSize);

        // Left shadow
        grad = ctx.createLinearGradient(left, 0, left + shadowSize, 0);
        grad.addColorStop(0, darkShadow);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(left, top, shadowSize, height);

        // Right shadow
        grad = ctx.createLinearGradient(left + width - shadowSize, 0, left + width, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, lightShadow);
        ctx.fillStyle = grad;
        ctx.fillRect(left + width - shadowSize, top, shadowSize, height);

        ctx.restore();
        ctx.restore();
      },

      beforeDatasetsDraw(chart: any) {
        const { ctx, chartArea } = chart;
        const { top, left, width, height } = chartArea;
        const radius = 15;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(left, top, width, height, radius);
        ctx.clip();
      },

      afterDatasetsDraw(chart: any) {
        chart.ctx.restore();
      },
    };

    this.blockChart = new Chart(ctx, {
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
      plugins: [backgroundFill],
      options: {
        layout: {
          padding: {
            right: 24,
          },
        },
        responsive: true,
        maintainAspectRatio: false,
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
            display: true,
            type: 'time',
            time: {
              unit: 'hour',
              displayFormats: {
                hour: 'HH:mm',
              },
            },
            border: {
              width: 0,
            },
            grid: {
              display: false,
            },
            ticks: {
              padding: 0,
              stepSize: 4,
              source: 'auto',
              major: {
                enabled: true,
              },
              font: {
                family: 'Poppins, sans-serif',
                weight: 'bolder',
                size: 12,
              },
            },
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
              padding: 0,
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

    // Store reference to this class for the plugin
    const dashboardComponent = this;

    //backgroundFill - uses class property for dynamic theme
    const backgroundFill = {
      id: 'backgroundFill',
      beforeDraw(chart: {
        ctx: CanvasRenderingContext2D;
        chartArea: { top: number; left: number; width: number; height: number };
      }) {
        const ctx = chart.ctx;
        const { top, left, width, height } = chart.chartArea;
        const radius = 15;
        const shadowSize = 8;
        const isDarkMode = dashboardComponent.isDarkMode;

        const bgColor = isDarkMode ? '#24272C' : '#e0e4e7';
        const darkShadow = isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)';
        const lightShadow = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)';

        ctx.save();

        // Rounded rectangle path
        ctx.beginPath();
        ctx.moveTo(left + radius, top);
        ctx.lineTo(left + width - radius, top);
        ctx.quadraticCurveTo(left + width, top, left + width, top + radius);
        ctx.lineTo(left + width, top + height - radius);
        ctx.quadraticCurveTo(left + width, top + height, left + width - radius, top + height);
        ctx.lineTo(left + radius, top + height);
        ctx.quadraticCurveTo(left, top + height, left, top + height - radius);
        ctx.lineTo(left, top + radius);
        ctx.quadraticCurveTo(left, top, left + radius, top);
        ctx.closePath();

        // Fill the background
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Clip to the rounded rectangle to make shadows respect corners
        ctx.save();
        ctx.clip();

        // Top shadow
        let grad = ctx.createLinearGradient(0, top, 0, top + shadowSize);
        grad.addColorStop(0, darkShadow);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(left, top, width, shadowSize);

        // Bottom shadow
        grad = ctx.createLinearGradient(0, top + height - shadowSize, 0, top + height);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, lightShadow);
        ctx.fillStyle = grad;
        ctx.fillRect(left, top + height - shadowSize, width, shadowSize);

        // Left shadow
        grad = ctx.createLinearGradient(left, 0, left + shadowSize, 0);
        grad.addColorStop(0, darkShadow);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(left, top, shadowSize, height);

        // Right shadow
        grad = ctx.createLinearGradient(left + width - shadowSize, 0, left + width, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, lightShadow);
        ctx.fillStyle = grad;
        ctx.fillRect(left + width - shadowSize, top, shadowSize, height);

        ctx.restore();
        ctx.restore();
      },

      beforeDatasetsDraw(chart: any) {
        const { ctx, chartArea } = chart;
        const { top, left, width, height } = chartArea;
        const radius = 15;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(left, top, width, height, radius);
        ctx.clip();
      },

      afterDatasetsDraw(chart: any) {
        chart.ctx.restore();
      },
    };

    this.txChart = new Chart(ctx, {
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
      plugins: [backgroundFill],
      options: {
        layout: {
          padding: {
            right: 24,
          },
        },
        responsive: true,
        maintainAspectRatio: false,
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
            display: true,
            type: 'time',
            time: {
              unit: 'hour',
              displayFormats: {
                hour: 'HH:mm',
              },
            },
            border: {
              width: 0,
            },
            grid: {
              display: false,
            },
            ticks: {
              padding: 0,
              stepSize: 4,
              source: 'auto',
              major: {
                enabled: true,
              },
              font: {
                family: 'Poppins, sans-serif',
                weight: 'bolder',
                size: 12,
              },
            },
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
              padding: 0,
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
function beforeDatasetsDraw(
  chart: {
    ctx: CanvasRenderingContext2D;
    chartArea: { top: number; left: number; width: number; height: number };
  },
  any: any,
) {
  throw new Error('Function not implemented.');
}
