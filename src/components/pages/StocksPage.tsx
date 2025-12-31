import { StockCard } from '@/components/widgets';
import { mockStockData } from '@/config/stocks';

/**
 * StocksPage - Stock tracking dashboard with responsive 2x2 grid layout
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
    <div className="h-full w-full page-padding flex flex-col overflow-hidden">
      {/* Centered 2x2 Grid Container */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl h-full max-h-[500px]">
          {mockStockData.map((stock) => (
            <StockCard key={stock.ticker} stock={stock} />
          ))}
        </div>
      </div>
    </div>
  );
}
