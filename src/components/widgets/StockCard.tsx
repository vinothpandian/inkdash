import { Card, CardContent } from '@/components/ui/card';
import type { StockData } from '@/types';

interface StockCardProps {
  stock: StockData;
}

/**
 * Sparkline - Simple SVG line chart for stock price history
 * Renders a smooth line showing price trend
 */
function Sparkline({
  data,
  isPositive,
}: {
  data: number[];
  isPositive: boolean;
}) {
  if (!data || data.length < 2) return null;

  const width = 70;
  const height = 28;
  const padding = 2;

  // Calculate min/max for scaling
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Generate SVG path points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <path
        d={pathD}
        fill="none"
        stroke={isPositive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * StockCard - Stock display card with ticker, price, change, and sparkline
 * Shows:
 * - Ticker symbol (top-left, bold)
 * - Percentage change (top-right, colored)
 * - Company name (below ticker, muted)
 * - Current price with currency (bottom-left)
 * - Mini sparkline chart (bottom-right)
 */
export function StockCard({ stock }: StockCardProps) {
  const isPositive = stock.changePercent >= 0;

  // Format percentage change with sign
  const changeText = `${isPositive ? '+' : ''}${stock.changePercent.toFixed(2)}%`;

  // Format price with currency
  const priceText = `${stock.currency}${stock.price.toFixed(2)}`;

  return (
    <Card className="h-full">
      <CardContent className="h-full flex flex-col justify-between p-4">
        {/* Top row: Ticker and Change */}
        <div className="flex justify-between items-start">
          <div className="text-base font-semibold text-foreground">
            {stock.ticker}
          </div>
          <div
            className={`text-xs font-medium-labels ${
              isPositive ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {changeText}
          </div>
        </div>

        {/* Company name */}
        <div className="text-xs text-muted-foreground -mt-1 truncate">
          {stock.name}
        </div>

        {/* Bottom row: Price and Sparkline */}
        <div className="flex justify-between items-end mt-auto pt-2">
          <div className="text-lg font-light-numbers text-foreground">
            {priceText}
          </div>
          <Sparkline data={stock.sparklineData} isPositive={isPositive} />
        </div>
      </CardContent>
    </Card>
  );
}
