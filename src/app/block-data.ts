export interface BlockData {
  blockId: number;
  channelName: string;
  tx: number;
  dataHash: string;
  blockHash: string;
  previousHash: string;
  txId: string[];
  size: number;
  timestamp: string;
}
