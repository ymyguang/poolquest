import deployment from '../../../deployments/xlayer-testnet.json';

export const xlayerDeployment = deployment;

export const XLAYER_CHAIN_ID = deployment.network.chainId;
export const XLAYER_CHAIN_HEX = `0x${XLAYER_CHAIN_ID.toString(16)}`;

export const xlayerParams = {
  chainId: XLAYER_CHAIN_HEX,
  chainName: deployment.network.name,
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18
  },
  rpcUrls: [deployment.network.rpcUrl],
  blockExplorerUrls: [deployment.network.explorerUrl]
};
