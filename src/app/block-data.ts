export interface BlockData {
  number: string;
  channelName?: string;
  previousHash: string;
  dataHash: string;
  blockHash?: string;
  txCount: number;
  txIds: string[];
  size: number;
  timestamp: string;
}
