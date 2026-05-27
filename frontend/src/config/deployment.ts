import deployment from '../../../deployments/xlayer.json';

export const xlayerDeployment = deployment;

export const XLAYER_CHAIN_ID = 196;
export const XLAYER_CHAIN_HEX = '0xc4';

export const xlayerParams = {
  chainId: XLAYER_CHAIN_HEX,
  chainName: 'X Layer Mainnet',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18
  },
  rpcUrls: [deployment.network.rpcUrl],
  blockExplorerUrls: [deployment.network.explorerUrl]
};
