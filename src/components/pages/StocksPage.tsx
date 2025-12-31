import { StockCard } from '@/components/widgets';
import { mockStockData } from '@/config/stocks';

/**
 * StocksPage - Refined stock tracking dashboard
 *
 * Hero area charts with gradient fills dominate each card.
 * Clean 2x2 grid with generous spacing.
 */
export function StocksPage() {
  return (
    <div className="h-full w-full page-padding flex flex-col overflow-hidden">
      {/* Full-height centered grid */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="grid grid-cols-2 gap-4 w-full max-w-3xl h-full max-h-[420px]">
          {mockStockData.map((stock) => (
            <StockCard key={stock.ticker} stock={stock} />
          ))}
        </div>
      </div>
    </div>
  );
}
