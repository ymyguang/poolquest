import { createWalletClient, custom, type Address } from 'viem';
import { xLayer } from '../config/wagmi';
import { XLAYER_CHAIN_HEX, xlayerParams } from '../config/deployment';

export type WalletState = {
  address: Address | null;
  chainId: number | null;
  status: 'missing' | 'disconnected' | 'wrong-network' | 'connected';
};

export const emptyWallet: WalletState = {
  address: null,
  chainId: null,
  status: typeof window !== 'undefined' && window.ethereum ? 'disconnected' : 'missing'
};

export const connectWallet = async (): Promise<WalletState> => {
  if (!window.ethereum) return { ...emptyWallet, status: 'missing' };
  const [address] = await window.ethereum.request<Address[]>({ method: 'eth_requestAccounts' });
  const chainHex = await window.ethereum.request<string>({ method: 'eth_chainId' });
  const chainId = Number.parseInt(chainHex, 16);
  return {
    address,
    chainId,
    status: chainId === xLayer.id ? 'connected' : 'wrong-network'
  };
};

export const switchToXLayer = async () => {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: XLAYER_CHAIN_HEX }]
    });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: number }).code : undefined;
    if (code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [xlayerParams]
      });
    } else {
      throw error;
    }
  }
};

export const walletClient = () => {
  if (!window.ethereum) return null;
  return createWalletClient({
    chain: xLayer,
    transport: custom(window.ethereum)
  });
};
