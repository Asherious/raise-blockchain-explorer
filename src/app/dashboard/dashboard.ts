import { Component, AfterViewInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlockData } from '../block-data';
import { PeerData } from '../peer-data';
import { RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
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
export class DASHBOARD implements AfterViewInit {
  // ViewChild references for the chart canvases
  @ViewChild('blockChartCanvas') blockChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('txChartCanvas') txChartRef!: ElementRef<HTMLCanvasElement>;
  // Inject PLATFORM_ID to check if running in browser
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initBlockChart());
      setTimeout(() => this.initTransactionChart());
    }
  }

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
          hourlyBins[key].txCount += block.tx;
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
  // Mock Data
  blockList: BlockData[] = [
    {
      blockId: 31,
      channelName: 'mychannel',
      dataHash: '3d8f60da8f83fd093599f1a08fb171bdaf8a971911e46c4a3af0467ca67c8ff1',
      tx: 3,
      blockHash: 'a5c7e0f2b9d1468c7f3a9e1b2d0c45f6a9b8c7d6e5f4032110a2b3c4d5e6f708',
      previousHash: '6b4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1020304050607080',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 75,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 0, 0)).toISOString(),
    },
    {
      blockId: 30,
      channelName: 'mychannel',
      dataHash: '3d8f60da8f83fd093599f1a08fb171bdaf8a971911e46c4a3af0467ca67c8ff1',
      tx: 4,
      blockHash: 'b1d0e9c8a7f65b4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1020',
      previousHash: 'a5c7e0f2b9d1468c7f3a9e1b2d0c45f6a9b8c7d6e5f4032110a2b3c4d5e6f708',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 121,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 0, 0)).toISOString(),
    },
    {
      blockId: 29,
      channelName: 'mychannel',
      dataHash: '3d8f60da8f83fd093599f1a08fb171bdaf8a971911e46c4a3af0467ca67c8ff1',
      tx: 3,
      blockHash: 'c9d8b7a65f4e3d2c1b0a9876543210fedcba9876543210fedcba9876543210',
      previousHash: 'b1d0e9c8a7f65b4a3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1020',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 68,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 1, 0)).toISOString(),
    },
    {
      blockId: 28,
      channelName: 'mychannel',
      dataHash: 'd4b8a1fbe2c8f1a9e9a3b6f0c0a1b2c3d4e5f67890abcdef1234567890abcdef',
      tx: 1,
      blockHash: 'd3c2b1a0f9e8d7c6b5a4938271605f4e3d2c1b0a9876543210fedcba987654321',
      previousHash: 'c9d8b7a65f4e3d2c1b0a9876543210fedcba9876543210fedcba9876543210',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 105,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 2, 0)).toISOString(),
    },
    {
      blockId: 27,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 1,
      blockHash: 'e0f1d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
      previousHash: 'd3c2b1a0f9e8d7c6b5a4938271605f4e3d2c1b0a9876543210fedcba987654321',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 92,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 3, 0)).toISOString(),
    },
    {
      blockId: 26,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 1,
      blockHash: 'f5e4d3c2b1a09876543210fedcba9876543210fedcba9876543210fedcba9876',
      previousHash: 'e0f1d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 55,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 3, 12)).toISOString(),
    },
    {
      blockId: 25,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 1,
      blockHash: '0a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f6789',
      previousHash: 'f5e4d3c2b1a09876543210fedcba9876543210fedcba9876543210fedcba9876',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 88,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 3, 12)).toISOString(),
    },
    {
      blockId: 24,
      channelName: 'mychannel',
      dataHash: '3d8f60da8f83fd093599f1a08fb171bdaf8a971911e46c4a3af0467ca67c8ff1',
      tx: 1,
      blockHash: '1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
      previousHash: '0a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f6789',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 145,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 4, 34)).toISOString(),
    },
    {
      blockId: 23,
      channelName: 'mychannel',
      dataHash: '3d8f60da8f83fd093599f1a08fb171bdaf8a971911e46c4a3af0467ca67c8ff1',
      tx: 1,
      blockHash: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
      previousHash: '1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 34,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 5, 30)).toISOString(),
    },
    {
      blockId: 21,
      channelName: 'mychannel',
      dataHash: '3d8f60da8f83fd093599f1a08fb171bdaf8a971911e46c4a3af0467ca67c8ff1',
      tx: 1,
      blockHash: '3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
      previousHash: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 110,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 5, 5)).toISOString(),
    },
    {
      blockId: 20,
      channelName: 'mychannel',
      dataHash: 'd4b8a1fbe2c8f1a9e9a3b6f0c0a1b2c3d4e5f67890abcdef1234567890abcdef',
      tx: 4,
      blockHash: '4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
      previousHash: '3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 99,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 6, 59)).toISOString(),
    },
    {
      blockId: 19,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 2,
      blockHash: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
      previousHash: '4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 61,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 7, 12)).toISOString(),
    },
    {
      blockId: 18,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 3,
      blockHash: '6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
      previousHash: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 130,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 7, 12)).toISOString(),
    },
    {
      blockId: 17,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 1,
      blockHash: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
      previousHash: '6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 42,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 8, 12)).toISOString(),
    },
    {
      blockId: 16,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 1,
      blockHash: '8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
      previousHash: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 79,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 9, 12)).toISOString(),
    },
    {
      blockId: 15,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 2,
      blockHash: '9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      previousHash: '8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 115,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 10, 12)).toISOString(),
    },
    {
      blockId: 14,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 1,
      blockHash: 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
      previousHash: '9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 28,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 11, 12)).toISOString(),
    },
    {
      blockId: 13,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 6,
      blockHash: 'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
      previousHash: 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 151,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 11, 12)).toISOString(),
    },
    {
      blockId: 12,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 4,
      blockHash: 'c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3',
      previousHash: 'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 102,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 11, 12)).toISOString(),
    },
    {
      blockId: 11,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 2,
      blockHash: 'd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
      previousHash: 'c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 66,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 12, 12)).toISOString(),
    },
    {
      blockId: 10,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 2,
      blockHash: 'e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
      previousHash: 'd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 95,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 13, 12)).toISOString(),
    },
    {
      blockId: 9,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 3,
      blockHash: 'f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
      previousHash: 'e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 133,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 14, 24)).toISOString(),
    },
    {
      blockId: 8,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 1,
      blockHash: '0a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
      previousHash: 'f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 50,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 15, 24)).toISOString(),
    },
    {
      blockId: 7,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 4,
      blockHash: '1b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c',
      previousHash: '0a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 118,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 16, 24)).toISOString(),
    },
    {
      blockId: 6,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 5,
      blockHash: '2c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
      previousHash: '1b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 140,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 17, 33)).toISOString(),
    },
    {
      blockId: 5,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 4,
      blockHash: '3d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
      previousHash: '2c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 81,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 17, 33)).toISOString(),
    },
    {
      blockId: 4,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 3,
      blockHash: '4e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
      previousHash: '3d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 125,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 17, 40)).toISOString(),
    },
    {
      blockId: 3,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 3,
      blockHash: '5f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
      previousHash: '4e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 70,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 18, 20)).toISOString(),
    },
    {
      blockId: 2,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 2,
      blockHash: '6a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      previousHash: '5f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 85,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 19, 45)).toISOString(),
    },
    {
      blockId: 1,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 2,
      blockHash: '6a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      previousHash: '5f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 85,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 19, 45)).toISOString(),
    },
    {
      blockId: 0,
      channelName: 'mychannel',
      dataHash: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
      tx: 2,
      blockHash: '7b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
      previousHash: '6a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      txId: [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        '88d7f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
        'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      ],
      size: 108,
      timestamp: new Date(new Date().setHours(new Date().getHours() - 19, 45)).toISOString(),
    },
  ];
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
