import { Link } from 'react-router-dom';
import { useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { xLayer } from '../config/wagmi';
import type { WalletState } from '../lib/wallet';
import { getUiLanguage, text } from '../lib/i18n';

export function WalletBar({ wallet }: {
  wallet: WalletState;
}) {
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const injected = connectors[0];
  const hasWallet = connectors.length > 0;
  const lang = getUiLanguage();
  const walletLabel = injected?.name || text(lang, 'Browser Wallet', '浏览器钱包');

  return (
    <nav className="wallet-bar">
      <Link to="/" className="brand-lockup">
        <div className="brand-mark">PQ</div>
        <div>
          <p className="eyebrow">PoolQuest</p>
          <p className="brand-sub">{text(lang, 'X Layer Hook Game', 'X Layer Hook 游戏')}</p>
        </div>
      </Link>

      <div className="wallet-info">
        {wallet.status === 'disconnected' && (
          <div className="wallet-connect-panel">
            <div className="wallet-copy">
              <span className="wallet-status">{text(lang, 'OKX / MetaMask / Browser Wallet', '支持 OKX / MetaMask / 浏览器钱包')}</span>
              <small>{text(lang, 'Connect wallet and switch to X Layer Testnet', '请连接钱包并切换到 X Layer Testnet')}</small>
            </div>
            <button
              className="btn btn-primary"
              disabled={!hasWallet || isPending}
              onClick={() => injected && connect({ connector: injected, chainId: xLayer.id })}
            >
              {isPending ? text(lang, 'Connecting...', '连接中...') : `${text(lang, 'Connect', '连接')} ${walletLabel}`}
            </button>
          </div>
        )}
        {wallet.status === 'wrong-network' && (
          <div className="wallet-connect-panel">
            <span className="wallet-address">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</span>
            <button
              className="btn btn-warning"
              disabled={switching}
              onClick={() => switchChain({ chainId: xLayer.id })}
            >
              {switching ? text(lang, 'Switching...', '切换中...') : text(lang, 'Switch to X Layer Testnet', '切换到 X Layer 测试网')}
            </button>
            <button className="btn btn-secondary" onClick={() => disconnect()}>{text(lang, 'Disconnect', '断开')}</button>
          </div>
        )}
        {wallet.status === 'connected' && wallet.address && (
          <div className="wallet-connect-panel">
            <span className="network-chip">X Layer Testnet</span>
            <span className="wallet-address">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </span>
            <button className="btn btn-secondary" onClick={() => disconnect()}>{text(lang, 'Disconnect', '断开')}</button>
          </div>
        )}
      </div>
    </nav>
  );
}
