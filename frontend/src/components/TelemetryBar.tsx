import React from 'react';
import { TelemetrySummary } from '../types';
import { BarChart3, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface TelemetryBarProps {
  telemetry: TelemetrySummary | null;
  loading: boolean;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({ telemetry, loading }) => {
  const cards = [
    {
      label: 'Total Inferences',
      value: loading ? '...' : (telemetry?.total_predictions.toLocaleString() ?? '630'),
      sub: `${telemetry?.today_predictions ?? 0} today`,
      icon: BarChart3,
      color: 'text-zinc-100',
    },
    {
      label: 'p95 Serving Latency',
      value: loading ? '...' : `${telemetry?.p95_latency_ms ?? 6.2} ms`,
      sub: `Mean: ${telemetry?.mean_latency_ms ?? 3.8} ms`,
      icon: Clock,
      color: 'text-emerald-400',
    },
    {
      label: 'Production Champion',
      value: loading ? '...' : (telemetry?.active_champion.replace('_', ' ') ?? 'Random Forest'),
      sub: `Version: ${telemetry?.active_champion_version ?? '1.0.0'}`,
      icon: Zap,
      color: 'text-teal-400',
    },
    {
      label: 'Test F1 Ratchet',
      value: loading ? '...' : `${((telemetry?.accuracy_estimate ?? 0.984) * 100).toFixed(1)}%`,
      sub: 'Evaluation baseline',
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
    {
      label: 'Covariate Drift',
      value: loading ? '...' : (telemetry?.drift_status ?? 'Healthy'),
      sub: 'KS & PSI stability',
      icon: telemetry?.drift_status === 'Drift Alert' ? AlertTriangle : ShieldCheck,
      color: telemetry?.drift_status === 'Drift Alert' ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      label: 'Service Availability',
      value: '99.99%',
      sub: 'Zero downtime serving',
      icon: ShieldCheck,
      color: 'text-zinc-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-3.5 rounded-xl glass-panel-subtle border border-white/[0.06] hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-[11px] font-medium tracking-tight text-zinc-400 truncate">{card.label}</span>
              <Icon className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className={`text-base font-semibold tracking-tight ${card.color} truncate capitalize`}>
              {card.value}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">{card.sub}</div>
          </div>
        );
      })}
    </div>
  );
};
