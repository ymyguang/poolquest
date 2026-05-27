import { Cable, CheckCircle2, ExternalLink, PlugZap, TriangleAlert } from 'lucide-react';
import { xlayerDeployment } from '../config/deployment';
import type { WalletState } from '../lib/wallet';

type Props = {
  wallet: WalletState;
  onConnect: () => void;
  onSwitch: () => void;
};

const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export function WalletBar({ wallet, onConnect, onSwitch }: Props) {
  const connected = wallet.status === 'connected';
  const wrongNetwork = wallet.status === 'wrong-network';

  return (
    <header className="wallet-bar">
      <div className="brand-lockup">
        <div className="brand-mark">PQ</div>
        <div>
          <p className="eyebrow">Uniswap V4 Hook on X Layer</p>
          <h1>PoolQuest Dragon Trial</h1>
        </div>
      </div>
      <div className="wallet-actions">
        <a className="network-pill" href={xlayerDeployment.network.explorerUrl} target="_blank" rel="noreferrer">
          <Cable size={16} />
          X Layer
          <ExternalLink size={14} />
        </a>
        {wallet.status === 'missing' && (
          <button className="primary-button muted" type="button" disabled>
            <TriangleAlert size={17} />
            Wallet missing
          </button>
        )}
        {wallet.status === 'disconnected' && (
          <button className="primary-button" type="button" onClick={onConnect}>
            <PlugZap size={17} />
            Connect
          </button>
        )}
        {wrongNetwork && (
          <button className="primary-button warn" type="button" onClick={onSwitch}>
            <TriangleAlert size={17} />
            Switch network
          </button>
        )}
        {connected && wallet.address && (
          <button className="primary-button success" type="button" onClick={onConnect}>
            <CheckCircle2 size={17} />
            {shortAddress(wallet.address)}
          </button>
        )}
      </div>
    </header>
  );
}
