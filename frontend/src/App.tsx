import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAccount, useChainId } from 'wagmi';
import { WalletBar } from './components/WalletBar';
import { AgentLobby } from './pages/AgentLobby';
import { AgentDetail } from './pages/AgentDetail';
import { RunInteraction } from './pages/RunInteraction';
import { CreateAgent } from './pages/CreateAgent';
import { DesignReview } from './pages/DesignReview';
import { PublishConfirm } from './pages/PublishConfirm';
import { xLayer } from './config/wagmi';
import type { WalletState } from './lib/wallet';
import { isReadmePreview } from './lib/i18n';

export default function App() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const preview = isReadmePreview();
  const wallet: WalletState = preview
    ? {
      address: '0x000000000000000000000000000000000000dEaD',
      chainId: xLayer.id,
      status: 'connected'
    }
    : {
      address: address ?? null,
      chainId: chainId ?? null,
      status: !isConnected
      ? 'disconnected'
      : chainId === xLayer.id
        ? 'connected'
        : 'wrong-network'
    };

  return (
    <BrowserRouter>
      <div className="app-shell">
        <WalletBar wallet={wallet} />
        <Routes>
          <Route path="/" element={<AgentLobby wallet={wallet} />} />
          <Route path="/agents/create" element={<CreateAgent wallet={wallet} />} />
          <Route path="/agents/:id" element={<AgentDetail wallet={wallet} />} />
          <Route path="/agents/:id/review" element={<DesignReview wallet={wallet} />} />
          <Route path="/agents/:id/publish" element={<PublishConfirm wallet={wallet} />} />
          <Route path="/agents/:id/run" element={<RunInteraction wallet={wallet} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
