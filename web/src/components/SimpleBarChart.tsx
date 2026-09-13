import type { ReactNode } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

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
  /** Skip the card chrome (border/shadow) when embedding inside a parent card. */
  bare?: boolean;
  /** Small pill next to the title, e.g. flagging mocked demo data. */
  badge?: string;
}

const CHART_HEIGHT_PX = 160;
const CARD_CLASSNAME = 'rounded-2xl border border-line-200 bg-surface p-5 shadow-sm';
const BRAND_600 = '#0E5A96';
const INK_700 = '#20202A';

interface AxisTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
}

function AxisTick({ x = 0, y = 0, payload, bars }: AxisTickProps & { bars: BarDatum[] }) {
  const bar = bars.find((b) => b.label === payload?.value);
  const numX = Number(x);
  const numY = Number(y);
  return (
    <foreignObject x={numX - 28} y={numY + 4} width={56} height={40}>
      <div className="flex flex-col items-center gap-0.5 text-center text-[11px] leading-tight text-ink-500">
        {bar?.icon}
        <span className="truncate">{payload?.value}</span>
      </div>
    </foreignObject>
  );
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { payload: BarDatum }[];
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const bar = payload[0]?.payload;
  if (!bar) return null;
  return (
    <div className="rounded-lg border border-line-200 bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-700 shadow-sm">
      {bar.label}: {bar.displayValue}
    </div>
  );
}

function TitleRow({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-sm font-semibold text-ink-700">{title}</h2>
      {badge && (
        <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
          {badge}
        </span>
      )}
    </div>
  );
}

export function SimpleBarChart({ title, bars, emptyMessage, bare = false, badge }: SimpleBarChartProps) {
  const Wrapper = bare ? 'div' : 'section';
  const wrapperClassName = bare ? undefined : CARD_CLASSNAME;

  if (bars.length === 0) {
    return (
      <Wrapper className={wrapperClassName}>
        <TitleRow title={title} badge={badge} />
        <p className="mt-2 text-sm text-ink-500">{emptyMessage}</p>
      </Wrapper>
    );
  }

  return (
    <Wrapper className={wrapperClassName}>
      <TitleRow title={title} badge={badge} />

      <div aria-hidden="true" className="mt-4" style={{ height: CHART_HEIGHT_PX }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars} margin={{ top: 20, right: 8, bottom: 4, left: 8 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              height={40}
              tick={(props: AxisTickProps) => <AxisTick {...props} bars={bars} />}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-canvas)' }} />
            <Bar dataKey="value" fill={BRAND_600} radius={[4, 4, 0, 0]} maxBarSize={32}>
              <LabelList dataKey="displayValue" position="top" fill={INK_700} fontSize={12} fontWeight={600} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
    </Wrapper>
  );
}
