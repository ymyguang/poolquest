import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 8787),
  databaseUrl: process.env.DATABASE_URL || '',
  llmProvider: process.env.LLM_PROVIDER || 'fallback',
  llmApiKey: process.env.LLM_API_KEY || '',
  llmEndpoint: process.env.LLM_ENDPOINT || '',
  llmModel: process.env.LLM_MODEL || 'gpt-4o',
  xlayerRpc: process.env.XLAYER_RPC || 'https://testrpc.xlayer.tech/terigon',
  chainId: Number(process.env.CHAIN_ID || 1952),
  poolManager: process.env.POOL_MANAGER || '0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32',
  qusdTokenAddress: process.env.QUSD_TOKEN_ADDRESS || '',
  registryAddress: process.env.REGISTRY_ADDRESS || '',
  seedPrizePoolQusd: Number(process.env.SEED_PRIZE_POOL_QUSD || 200),
} as const;
