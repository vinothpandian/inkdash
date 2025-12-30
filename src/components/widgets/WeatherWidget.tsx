import { Card, CardContent } from '@/components/ui/card';
import { getMockWeatherData } from '@/config/weather';

/**
 * WeatherWidget - Weather display with hourly forecast
 * Shows condition, feels-like temp, hourly bar chart, and location
 */
export function WeatherWidget() {
  const weather = getMockWeatherData();

  // Parse sunrise/sunset times
  const sunriseDate = new Date(weather.sunrise);
  const sunsetDate = new Date(weather.sunset);
  const sunriseHour = sunriseDate.getHours();
  const sunsetHour = sunsetDate.getHours();

  // Format sunrise/sunset for display
  const formatHour = (date: Date) => {
    const hour = date.getHours();
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${ampm}`;
  };

  // Get min/max temperatures for scaling
  const temps = weather.hourlyForecast.map((h) => h.temperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp || 1;

  // Condition display text (capitalize each word, replace hyphens with spaces)
  const conditionText = weather.condition
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Feels like temperature with unit and degree symbol
  const feelsLikeText = `${weather.feelsLike}°${weather.unit === 'celsius' ? 'C' : 'F'}`;

  return (
    <Card className="h-full shadow-soft border-0 flex flex-col">
      <CardContent className="flex-1 flex flex-col p-5">
        {/* Condition */}
        <div className="text-lg font-medium-labels text-foreground">
          {conditionText}
        </div>

        {/* Feels like */}
        <div className="text-sm text-muted-foreground mt-1">
          Feels like {feelsLikeText}
        </div>

        {/* Hourly bar chart */}
        <div className="flex-1 flex items-end gap-[2px] mt-4 mb-2">
          {weather.hourlyForecast.map((hourData) => {
            const isDay = hourData.hour >= sunriseHour && hourData.hour < sunsetHour;
            const heightPercent =
              ((hourData.temperature - minTemp) / tempRange) * 60 + 20; // 20-80% range

            return (
              <div
                key={hourData.hour}
                className={`flex-1 rounded-sm transition-colors ${
                  isDay ? 'bg-foreground' : 'bg-muted-foreground/30'
                }`}
                style={{ height: `${heightPercent}%` }}
                title={`${hourData.hour}:00 - ${hourData.temperature}°${weather.unit === 'celsius' ? 'C' : 'F'}`}
              />
            );
          })}
        </div>

        {/* Sunrise/Sunset markers */}
        <div className="flex justify-between text-xs text-muted-foreground mb-3">
          <span>{formatHour(sunriseDate)}</span>
          <span>{formatHour(sunsetDate)}</span>
        </div>

        {/* Location */}
        <div className="text-sm text-center text-muted-foreground">
          {weather.location.city}
        </div>
      </CardContent>
    </Card>
  );
}
