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
import { AppService } from '../app.service';
import 'chartjs-adapter-date-fns';
// Import Chart.js components
import {
  Chart,
  LineController,
  LineElement,
  BarController,
  BarElement,
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
  BarController,
  BarElement,
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
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  // X-axis tick placeholders
  ticks = Array.from({ length: 9 });

  // Inject HttpClient for API calls
  private http: HttpClient = inject(HttpClient);
  private appService: AppService = inject(AppService);
  private cdr = inject(ChangeDetectorRef);

  private themeObserver: MutationObserver | null = null;
  private isDarkMode: boolean = false;

  error: string | null = null;
  isLoading = true;

  blockList: any[] = [];
  nodeList: any[] = [];

  get totalBlocks(): any[] {
    return this.blockList;
  }

  get totalTransactions(): number {
    return this.blockList.reduce((sum, block) => sum + block.txCount, 0);
  }

  selectedBlocksRange: '24h' | 'week' | 'month' | 'all' = '24h';
  selectedTxRange: '24h' | 'week' | 'month' | 'all' = '24h';

  setBlocksRange(range: '24h' | 'week' | 'month' | 'all') {
    this.selectedBlocksRange = range;

    if (this.selectedBlocksRange === '24h') {
      this.initBlockChart(this.getBlocksPerHour(), '24h');
    } else if (this.selectedBlocksRange === 'week') {
      this.initBlockChart(this.getBlocksPerDay(7), 'week');
    } else if (this.selectedBlocksRange === 'month') {
      this.initBlockChart(this.getBlocksPerDay(30), 'month');
    } else if (this.selectedBlocksRange === 'all') {
      this.initBlockChart(this.getBlocksAllTime(), 'all');
    }
  }

  setTxRange(range: '24h' | 'week' | 'month' | 'all') {
    this.selectedTxRange = range;

    if (this.selectedTxRange === '24h') {
      this.initTransactionChart(this.getTxPerHour(), '24h');
    } else if (this.selectedTxRange === 'week') {
      this.initTransactionChart(this.getTxPerDay(7), 'week');
    } else if (this.selectedTxRange === 'month') {
      this.initTransactionChart(this.getTxPerDay(30), 'month');
    } else if (this.selectedTxRange === 'all') {
      this.initTransactionChart(this.getTxAllTime(), 'all');
    }
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
    this.error = null;

    forkJoin({
      blocks: this.appService.getAllBlocks(),
      nodes: this.appService.getAllNodes(),
    }).subscribe({
      next: ({ blocks, nodes }) => {
        this.blockList = blocks.sort((a, b) => parseInt(b.number) - parseInt(a.number));

        this.nodeList = nodes;

        this.initBlockChart();
        this.initTransactionChart();
      },
      error: (err) => {
        console.error('Failed to fetch data', err);
        this.error = 'Failed to load dashboard data';
      },
      complete: () => {
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

  // Block Chart
  initBlockChart(data?: { x: Date; y: number }[], range: '24h' | 'week' | 'month' | 'all' = '24h') {
    if (!this.blockChartRef?.nativeElement) return;

    const ctx = this.blockChartRef.nativeElement;
    Chart.getChart(ctx)?.destroy();

    const Data = data || this.getBlocksPerHour();
    const isAllTime = this.selectedBlocksRange === 'all';
    const isDaily = this.selectedBlocksRange === 'week' || this.selectedBlocksRange === 'month';

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
            data: Data,
            backgroundColor: gradientblockFill,
            tension: 0.1,
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
              title: (tooltipItems: any) => {
                if (!tooltipItems.length) return '';

                const date = tooltipItems[0].parsed.x;

                if (this.selectedBlocksRange === '24h') {
                  return new Intl.DateTimeFormat('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }).format(date);
                }

                if (this.selectedBlocksRange === 'week' || this.selectedBlocksRange === 'month') {
                  return new Intl.DateTimeFormat('en-US', {
                    day: '2-digit',
                    month: 'short',
                  }).format(date);
                }

                return new Intl.DateTimeFormat('en-US', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).format(date);
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
              unit:
                this.selectedBlocksRange === 'all'
                  ? 'month'
                  : this.selectedBlocksRange === 'month'
                    ? 'day'
                    : this.selectedBlocksRange === 'week'
                      ? 'day'
                      : 'hour',
              displayFormats: {
                hour: 'HH:mm',
                day: 'dd MMM',
                year: 'MMM yyyy',
              },
            },
            border: {
              width: 0,
            },
            grid: {
              display: false,
            },
            ticks: {
              autoSkip: false,
              padding: 0,
              stepSize:
                this.selectedBlocksRange === 'all'
                  ? 1
                  : this.selectedBlocksRange === 'month'
                    ? 3
                    : this.selectedBlocksRange === 'week'
                      ? 1
                      : 4,
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
            suggestedMax: 10,
            border: {
              width: 0,
            },
            grid: {
              display: false,
            },
            ticks: {
              padding: 0,
              source: 'auto',
              font: {
                family: 'Poppins, sans-serif',
                weight: 'bolder',
                size: 12,
              },
              callback: function (value: any) {
                return value === 0 ? '' : value;
              },
            },
          },
        },
      },
    });
  }

  // Transactions Chart
  initTransactionChart(
    data?: { x: Date; y: number }[],
    range: '24h' | 'week' | 'month' | 'all' = '24h',
  ) {
    if (!this.txChartRef || !this.txChartRef.nativeElement) {
      console.error('Transaction Chart Canvas not found or not ready.');
      return;
    }

    const Data = data || this.getTxPerHour();
    const isAllTime = this.selectedTxRange === 'all';
    const isDaily = this.selectedTxRange === 'week' || this.selectedTxRange === 'month';

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
            data: Data,
            backgroundColor: gradienttxFill,
            tension: 0.1,
            borderWidth: 0,
            borderColor: gradienttxFill,
            pointRadius: 0,
            pointHitRadius: 10,
            fill: 'origin',
            spanGaps: false,
          },
        ],
      },
      plugins: [backgroundFill],
      options: {
        layout: { padding: { right: 24 } },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (tooltipItems: any) => {
                if (!tooltipItems.length) return '';

                const date = tooltipItems[0].parsed.x;

                if (this.selectedTxRange === '24h') {
                  return new Intl.DateTimeFormat('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }).format(date);
                }

                if (this.selectedTxRange === 'week' || this.selectedTxRange === 'month') {
                  return new Intl.DateTimeFormat('en-US', {
                    day: '2-digit',
                    month: 'short',
                  }).format(date);
                }

                return new Intl.DateTimeFormat('en-US', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }).format(date);
              },
              label: function (context: any) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) label += context.parsed.y;
                return label;
              },
            },
          },
        },
        interaction: { intersect: false },
        scales: {
          x: {
            display: true,
            type: 'time',
            time: {
              unit:
                this.selectedTxRange === 'all'
                  ? 'month'
                  : this.selectedTxRange === 'month'
                    ? 'day'
                    : this.selectedTxRange === 'week'
                      ? 'day'
                      : 'hour',
              displayFormats: {
                hour: 'HH:mm',
                day: 'dd MMM',
                year: 'MMM yyyy',
              },
            },
            border: { width: 0 },
            grid: { display: false },
            ticks: {
              padding: 0,
              stepSize:
                this.selectedTxRange === 'all'
                  ? 1
                  : this.selectedTxRange === 'month'
                    ? 3
                    : this.selectedTxRange === 'week'
                      ? 1
                      : 4,
              source: 'auto',
              major: { enabled: true },
              font: { family: 'Poppins, sans-serif', weight: 'bolder', size: 12 },
            },
          },
          y: {
            display: true,
            min: 0,
            suggestedMax: 10,
            border: { width: 0 },
            grid: { display: false },
            ticks: {
              padding: 0,
              source: 'auto',
              font: { family: 'Poppins, sans-serif', weight: 'bolder', size: 12 },
              callback: (value: any) => (value === 0 ? '' : value),
            },
          },
        },
      },
    });
  }

  // Block and Transaction data methods
  getBlocksPerHour() {
    const now = Date.now();
    const hour = 60 * 60 * 1000;

    const hourlyBins: { [key: number]: { blockCount: number; latestTs: number } } = {};

    for (let i = 24; i >= 0; i--) {
      const startOfHour = new Date(now - i * hour);
      startOfHour.setMinutes(0, 0, 0);
      hourlyBins[startOfHour.getTime()] = {
        blockCount: 0,
        latestTs: startOfHour.getTime(),
      };
    }

    this.blockList.forEach((block) => {
      const blockTs = new Date(block.timestamp).getTime();

      if (blockTs >= now - 24 * hour && blockTs <= now) {
        const blockDate = new Date(blockTs);
        blockDate.setMinutes(0, 0, 0);
        const key = blockDate.getTime();

        if (hourlyBins[key]) {
          hourlyBins[key].blockCount++;
          if (blockTs > hourlyBins[key].latestTs) {
            hourlyBins[key].latestTs = blockTs;
          }
        }
      }
    });

    /* 🔥 ADD 30 FAKE ENTRIES HERE */
    /*for (let i = 1; i <= 50; i++) {
      const fakeHour = new Date(now - (24 + i) * hour);
      fakeHour.setMinutes(0, 0, 0);

      const fakeKey = fakeHour.getTime();

      if (!hourlyBins[fakeKey]) {
        hourlyBins[fakeKey] = {
          blockCount: Math.floor(Math.random() * 15) + 1, // fake block blockCount
          latestTs: fakeKey,
        };
      }
    }*/

    return Object.keys(hourlyBins)
      .sort((a, b) => Number(a) - Number(b))
      .map((timestampStr) => {
        const hourBin = hourlyBins[Number(timestampStr)];
        return { x: new Date(hourBin.latestTs), y: hourBin.blockCount };
      });
  }

  getBlocksPerWeek() {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const weekMs = 7 * 24 * hour;

    const hourlyBins: { [key: number]: number } = {};

    // Initialize 7*24 hourly bins
    for (let i = 7 * 24; i >= 0; i--) {
      const date = new Date(now - i * hour);
      date.setMinutes(0, 0, 0);
      hourlyBins[date.getTime()] = 0;
    }

    this.blockList.forEach((block) => {
      const ts = new Date(block.timestamp).getTime();
      if (ts >= now - weekMs && ts <= now) {
        const date = new Date(ts);
        date.setMinutes(0, 0, 0);
        const key = date.getTime();
        if (hourlyBins[key] !== undefined) {
          hourlyBins[key]++;
        }
      }
    });

    return Object.keys(hourlyBins)
      .sort((a, b) => Number(a) - Number(b))
      .map((ts) => ({ x: new Date(Number(ts)), y: hourlyBins[Number(ts)] }));
  }

  getBlocksPerDay(days: number) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const dailyBins: { [key: number]: number } = {};

    for (let i = days; i >= 0; i--) {
      const date = new Date(now - i * dayMs);
      date.setHours(0, 0, 0, 0);

      dailyBins[date.getTime()] = 0;
    }

    this.blockList.forEach((block) => {
      const ts = new Date(block.timestamp).getTime();

      if (ts >= now - days * dayMs && ts <= now) {
        const d = new Date(ts);
        d.setHours(0, 0, 0, 0);

        const key = d.getTime();

        if (dailyBins[key] !== undefined) {
          dailyBins[key]++;
        }
      }
    });

    return Object.keys(dailyBins)
      .sort((a, b) => Number(a) - Number(b))
      .map((ts) => ({
        x: new Date(Number(ts)),
        y: dailyBins[Number(ts)],
      }));
  }

  getBlocksAllTime() {
    const dailyBins: { [key: string]: { blockCount: number } } = {};

    this.blockList.forEach((block) => {
      const timestamp = block.timestamp?.seconds ? block.timestamp.seconds * 1000 : block.timestamp;

      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return;

      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      const key = `${year}-${month}-${day}`;

      if (!dailyBins[key]) {
        dailyBins[key] = { blockCount: 0 };
      }

      dailyBins[key].blockCount++;
    });

    return Object.keys(dailyBins)
      .sort((a, b) => {
        const [yA, mA, dA] = a.split('-').map(Number);
        const [yB, mB, dB] = b.split('-').map(Number);

        if (yA !== yB) return yA - yB;
        if (mA !== mB) return mA - mB;
        return dA - dB;
      })
      .map((key) => {
        const [year, month, day] = key.split('-').map(Number);

        return {
          x: new Date(year, month, day),
          y: dailyBins[key].blockCount,
        };
      });
  }

  getTxPerHour() {
    const now = Date.now();
    const hour = 60 * 60 * 1000;

    const hourlyBins: { [key: number]: { txCount: number; latestTs: number } } = {};
    for (let i = 24; i >= 0; i--) {
      const startOfHour = new Date(now - i * hour);
      startOfHour.setMinutes(0, 0, 0);
      hourlyBins[startOfHour.getTime()] = { txCount: 0, latestTs: startOfHour.getTime() };
    }

    this.blockList.forEach((block) => {
      const blockTs = new Date(block.timestamp).getTime();

      if (blockTs >= now - 24 * hour && blockTs <= now) {
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

    /* 🔥 ADD 30 FAKE ENTRIES HERE */
    /*for (let i = 1; i <= 50; i++) {
      const fakeHour = new Date(now - (24 + i) * hour);
      fakeHour.setMinutes(0, 0, 0);

      const fakeKey = fakeHour.getTime();

      if (!hourlyBins[fakeKey]) {
        hourlyBins[fakeKey] = {
          txCount: Math.floor(Math.random() * 15) + 1, // fake transaction
          latestTs: fakeKey,
        };
      }
    }*/

    return Object.keys(hourlyBins)
      .sort((a, b) => Number(a) - Number(b))
      .map((timestampStr) => {
        const hourBin = hourlyBins[Number(timestampStr)];
        return { x: new Date(hourBin.latestTs), y: hourBin.txCount };
      });
  }

  getTxPerDay(days: number) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const dailyBins: { [key: number]: { txCount: number; latestTs: number } } = {};

    for (let i = days; i >= 0; i--) {
      const date = new Date(now - i * day);
      date.setHours(0, 0, 0, 0);

      dailyBins[date.getTime()] = {
        txCount: 0,
        latestTs: date.getTime(),
      };
    }

    this.blockList.forEach((block) => {
      const blockTs = new Date(block.timestamp).getTime();

      if (blockTs >= now - days * day && blockTs <= now) {
        const blockDate = new Date(blockTs);
        blockDate.setHours(0, 0, 0, 0);

        const key = blockDate.getTime();

        if (dailyBins[key]) {
          dailyBins[key].txCount += block.txCount;

          if (blockTs > dailyBins[key].latestTs) {
            dailyBins[key].latestTs = blockTs;
          }
        }
      }
    });

    return Object.keys(dailyBins)
      .sort((a, b) => Number(a) - Number(b))
      .map((ts) => {
        const bin = dailyBins[Number(ts)];
        return { x: new Date(Number(ts)), y: bin.txCount };
      });
  }

  getTxAllTime() {
    const dailyBins: { [key: number]: { txCount: number; latestTs: number } } = {};

    this.blockList.forEach((block) => {
      const blockTs = new Date(block.timestamp).getTime();

      const blockDate = new Date(blockTs);
      blockDate.setHours(0, 0, 0, 0);

      const key = blockDate.getTime();

      if (!dailyBins[key]) {
        dailyBins[key] = {
          txCount: 0,
          latestTs: blockTs,
        };
      }

      dailyBins[key].txCount += block.txCount;

      if (blockTs > dailyBins[key].latestTs) {
        dailyBins[key].latestTs = blockTs;
      }
    });

    return Object.keys(dailyBins)
      .sort((a, b) => Number(a) - Number(b))
      .map((ts) => {
        const bin = dailyBins[Number(ts)];
        return { x: new Date(bin.latestTs), y: bin.txCount };
      });
  }
}
