/**
 * Chain Adapter — real on-chain interactions via viem.
 * All game state mutations go through PoolQuestRouter (which calls Hook internally).
 */

import { createPublicClient, createWalletClient, http, type Address, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config.js';

const xLayer = {
  id: config.chainId,
  name: config.chainId === 1952 ? 'X Layer Testnet' : 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: [config.xlayerRpc] } },
} as const;

export interface ChainRunState {
  active: boolean;
  completed: boolean;
  progress: number;
  totalSteps: number;
  startedAt: number;
  actionCount: number;
  hintCount: number;
  hintPenalty: bigint;
  cursePenalty: bigint;
  finalScore: bigint;
}

// ABI for Router
const ROUTER_ABI = [
  {
    name: 'enterRun',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'agentId', type: 'bytes32' },
      { name: 'creator', type: 'address' },
      { name: 'totalSteps', type: 'uint8' },
      { name: 'ruleHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'purchaseHint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'level', type: 'uint8' },
      { name: 'feeQusd', type: 'uint256' },
      { name: 'penalty', type: 'int256' },
    ],
    outputs: [],
  },
] as const;

// ABI for Hook (read-only)
const HOOK_ABI = [
  {
    name: 'getRun',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'active', type: 'bool' },
          { name: 'completed', type: 'bool' },
          { name: 'progress', type: 'uint8' },
          { name: 'totalSteps', type: 'uint8' },
          { name: 'startedAt', type: 'uint40' },
          { name: 'lastActionAt', type: 'uint40' },
          { name: 'lastBuyAt', type: 'uint40' },
          { name: 'lastLpAddAt', type: 'uint40' },
          { name: 'hintCount', type: 'uint8' },
          { name: 'actionCount', type: 'uint8' },
          { name: 'hintPenalty', type: 'int256' },
          { name: 'cursePenalty', type: 'int256' },
          { name: 'finalScore', type: 'int256' },
          { name: 'ruleHash', type: 'bytes32' },
        ],
      },
    ],
  },
] as const;

export class ViemChainAdapter {
  private publicClient;
  private walletClient;
  private hookAddress: Address;
  private routerAddress: Address;

  constructor(hookAddress: string, routerAddress: string) {
    this.hookAddress = hookAddress as Address;
    this.routerAddress = routerAddress as Address;

    this.publicClient = createPublicClient({
      chain: xLayer,
      transport: http(config.xlayerRpc),
    });

    const pk = process.env.DEPLOYER_PRIVATE_KEY;
    if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set');
    const account = privateKeyToAccount(pk as `0x${string}`);

    this.walletClient = createWalletClient({
      account,
      chain: xLayer,
      transport: http(config.xlayerRpc),
    });
  }

  async startRun(
    playerAddress: string,
    agentId: string,
    totalSteps: number,
    ruleHash: string,
    creatorAddress: string,
  ): Promise<Hash> {
    const hash = await this.walletClient.writeContract({
      address: this.routerAddress,
      abi: ROUTER_ABI,
      functionName: 'enterRun',
      args: [
        playerAddress as Address,
        agentId as `0x${string}`,
        creatorAddress as Address,
        totalSteps,
        ruleHash as `0x${string}`,
      ],
    });
    return hash;
  }

  async recordHint(
    playerAddress: string,
    level: number,
    feeQusd: bigint,
    penalty: bigint,
  ): Promise<Hash> {
    const hash = await this.walletClient.writeContract({
      address: this.routerAddress,
      abi: ROUTER_ABI,
      functionName: 'purchaseHint',
      args: [playerAddress as Address, level, feeQusd, penalty],
    });
    return hash;
  }

  async getRunState(playerAddress: string): Promise<ChainRunState | null> {
    try {
      const run = await this.publicClient.readContract({
        address: this.hookAddress,
        abi: HOOK_ABI,
        functionName: 'getRun',
        args: [playerAddress as Address],
      });
      return {
        active: run.active,
        completed: run.completed,
        progress: run.progress,
        totalSteps: run.totalSteps,
        startedAt: Number(run.startedAt),
        actionCount: run.actionCount,
        hintCount: run.hintCount,
        hintPenalty: run.hintPenalty,
        cursePenalty: run.cursePenalty,
        finalScore: run.finalScore,
      };
    } catch {
      return null;
    }
  }
}

let _adapter: ViemChainAdapter | null = null;

export function createChainAdapter(): ViemChainAdapter | null {
  const hookAddr = process.env.HOOK_ADDRESS;
  const routerAddr = process.env.ROUTER_ADDRESS;
  if (!hookAddr || !routerAddr || !process.env.DEPLOYER_PRIVATE_KEY) {
    return null;
  }
  if (!_adapter) {
    _adapter = new ViemChainAdapter(hookAddr, routerAddr);
  }
  return _adapter;
}
