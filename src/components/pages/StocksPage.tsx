import { StockCard } from '@/components/widgets';
import { useStocks } from '@/hooks/useStocks';
import { Card } from '@/components/ui/card';

/**
 * StocksPage - Refined stock tracking dashboard
 *
 * Hero area charts with gradient fills dominate each card.
 * Clean 2x2 grid with generous spacing.
 */
export function StocksPage() {
  const { stocks, isLoading, error } = useStocks();

  // Loading skeleton
  if (isLoading && stocks.length === 0) {
    return (
      <div className="h-full w-full page-padding flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="grid grid-cols-2 gap-4 w-full max-w-3xl h-full max-h-[420px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-full animate-pulse">
                <div className="h-full flex flex-col p-4">
                  <div className="flex justify-between">
                    <div>
                      <div className="h-6 w-16 bg-muted rounded" />
                      <div className="h-3 w-24 bg-muted rounded mt-2" />
                    </div>
                    <div className="text-right">
                      <div className="h-8 w-24 bg-muted rounded" />
                      <div className="h-4 w-16 bg-muted rounded mt-2 ml-auto" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state with no cached data
  if (stocks.length === 0 && error) {
    return (
      <div className="h-full w-full page-padding flex items-center justify-center">
        <span className="text-sm text-muted-foreground">{error}</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full page-padding flex flex-col overflow-hidden">
      {/* Full-height centered grid */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="grid grid-cols-2 gap-4 w-full max-w-3xl h-full max-h-[420px]">
          {stocks.map((stock) => (
            <StockCard key={stock.ticker} stock={stock} />
          ))}
        </div>
      </div>
    </div>
  );
}
