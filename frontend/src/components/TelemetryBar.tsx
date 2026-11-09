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
      value: loading ? 'Loading' : (telemetry?.total_predictions.toLocaleString() ?? 'Unavailable'),
      sub: `${telemetry?.today_predictions ?? 0} today`,
      icon: BarChart3,
      color: 'text-zinc-100',
    },
    {
      label: 'p95 Serving Latency',
      value: loading ? 'Loading' : (telemetry?.p95_latency_ms != null ? `${telemetry.p95_latency_ms} ms` : 'Unavailable'),
      sub: telemetry?.mean_latency_ms != null ? `Mean: ${telemetry.mean_latency_ms} ms` : 'Mean latency unavailable',
      icon: Clock,
      color: 'text-emerald-400',
    },
    {
      label: 'Production Champion',
      value: loading ? 'Loading' : (telemetry?.active_champion?.replace(/_/g, ' ') ?? 'Unavailable'),
      sub: telemetry?.active_champion_version ? `Version: ${telemetry.active_champion_version}` : 'Version unavailable',
      icon: Zap,
      color: 'text-teal-400',
    },
    {
      label: 'Model accuracy estimate',
      value: loading ? 'Loading' : (telemetry?.accuracy_estimate != null ? `${(telemetry.accuracy_estimate * 100).toFixed(1)}%` : 'Unavailable'),
      sub: 'Evaluation baseline',
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
    {
      label: 'Covariate Drift',
      value: loading ? 'Loading' : (telemetry?.drift_status ?? 'Unavailable'),
      sub: 'KS & PSI stability',
      icon: telemetry?.drift_status === 'Drift Alert' ? AlertTriangle : ShieldCheck,
      color: telemetry?.drift_status === 'Drift Alert' ? 'text-amber-400' : telemetry?.drift_status ? 'text-emerald-300' : 'text-zinc-400',
    },
  ];

  return (
    <section className="telemetry-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6" aria-label="Live service telemetry">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <article
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
          </article>
        );
      })}
    </section>
  );
};
