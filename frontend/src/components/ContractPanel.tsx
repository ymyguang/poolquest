import { Copy, ExternalLink } from 'lucide-react';
import { xlayerDeployment } from '../config/deployment';

const display = (value: string) => value || 'pending deployment';
const explorer = (address: string) => `${xlayerDeployment.network.explorerUrl}/address/${address}`;

export function ContractPanel() {
  const items = [
    ['PoolManager', xlayerDeployment.uniswapV4.poolManager],
    ['V4 PoolId', xlayerDeployment.uniswapV4.poolId],
    ['Hook', xlayerDeployment.contracts.hook],
    ['Router', xlayerDeployment.contracts.router],
    ['QUSD', xlayerDeployment.contracts.qusd],
    ['DRAGON', xlayerDeployment.contracts.dragon]
  ];

  return (
    <section className="contract-panel">
      <div className="panel-heading">
        <span>Submission addresses</span>
        <Copy size={18} />
      </div>
      {items.map(([label, value]) => (
        <div className="contract-row" key={label}>
          <span>{label}</span>
          {value && value.startsWith('0x') && value.length === 42 ? (
            <a href={explorer(value)} target="_blank" rel="noreferrer">
              {display(value)}
              <ExternalLink size={13} />
            </a>
          ) : (
            <code>{display(value)}</code>
          )}
        </div>
      ))}
    </section>
  );
}
