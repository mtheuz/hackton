import type { ReactNode } from 'react';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  displayValue: string;
  icon?: ReactNode;
  /** Fuller text for the accessible table row when `label` is trimmed for the visual caption. */
  tableLabel?: string;
}

interface SimpleBarChartProps {
  title: string;
  bars: BarDatum[];
  emptyMessage: string;
}

const CHART_HEIGHT_PX = 140;

export function SimpleBarChart({ title, bars, emptyMessage }: SimpleBarChartProps) {
  if (bars.length === 0) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">{title}</h2>
        <p className="mt-2 text-sm text-ink-500">{emptyMessage}</p>
      </section>
    );
  }

  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-700">{title}</h2>

      <div
        aria-hidden="true"
        className="mt-4 flex items-stretch justify-between gap-3"
        style={{ height: CHART_HEIGHT_PX }}
      >
        {bars.map((bar) => {
          const pct = Math.max(4, Math.round((bar.value / maxValue) * 100));
          return (
            <div key={bar.key} className="flex flex-1 flex-col items-center">
              <span className="text-center text-xs font-semibold text-ink-700">{bar.displayValue}</span>
              <div className="mt-1 flex w-full flex-1 items-end justify-center">
                <div
                  data-bar-fill="true"
                  className="w-full max-w-6 rounded-t-[4px] bg-brand-600"
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="mt-1.5 flex items-center gap-1 text-center text-[11px] leading-tight text-ink-500">
                {bar.icon}
                {bar.label}
              </span>
            </div>
          );
        })}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.key}>
              <td>{bar.tableLabel ?? bar.label}</td>
              <td>{bar.displayValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
