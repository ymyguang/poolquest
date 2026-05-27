import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';
import { xlayerDeployment } from './deployment';

export const xLayer = defineChain({
  id: 196,
  name: 'X Layer Mainnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: [xlayerDeployment.network.rpcUrl] } },
  blockExplorers: { default: { name: 'OKLink', url: xlayerDeployment.network.explorerUrl } }
});

export const wagmiConfig = createConfig({
  chains: [xLayer],
  connectors: [injected()],
  transports: {
    [xLayer.id]: http(xlayerDeployment.network.rpcUrl)
  }
});
