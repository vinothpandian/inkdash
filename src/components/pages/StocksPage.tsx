import { StockCard } from '@/components/widgets';
import { mockStockData } from '@/config/stocks';

/**
 * StocksPage - Stock tracking dashboard with 2x2 grid layout
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ┌──────────────────────────┐  ┌──────────────────────────────┐ │
 * │  │  TRI          +1.11%     │  │  VEQT.TO        -0.53%       │ │
 * │  │  Thomson Reuters         │  │  Vanguard All-Equity         │ │
 * │  │  $213.45    ~~~~~~~~~~~~ │  │  C$42.87       ~~~~~~~~~~~~  │ │
 * │  └──────────────────────────┘  └──────────────────────────────┘ │
 * │  ┌──────────────────────────┐  ┌──────────────────────────────┐ │
 * │  │  VGRO.TO      +0.45%     │  │  ZGLD.TO        +2.37%       │ │
 * │  │  Vanguard Growth         │  │  BMO Gold ETF                │ │
 * │  │  C$33.12    ~~~~~~~~~~~~ │  │  C$28.94       ~~~~~~~~~~~~  │ │
 * │  └──────────────────────────┘  └──────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────┘
 */
export function StocksPage() {
  return (
    <div className="h-full w-full p-6 flex items-center justify-center">
      {/* 2x2 Grid Container */}
      <div className="grid grid-cols-2 gap-5 max-w-2xl w-full aspect-[4/3]">
        {mockStockData.map((stock) => (
          <StockCard key={stock.ticker} stock={stock} />
        ))}
      </div>
    </div>
  );
}
