import React, { useState, useEffect } from 'react';
import { DriftResponse } from '../types';
import { api } from '../services/api';
import { CheckCircle2, RefreshCw, Zap, ShieldAlert, Layers } from 'lucide-react';

export const DriftMonitorView: React.FC = () => {
  const [drift, setDrift] = useState<DriftResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [simulateShift, setSimulateShift] = useState<boolean>(false);

  const fetchDrift = async (sim: boolean = simulateShift) => {
    setLoading(true);
    try {
      const data = await api.getDrift(sim);
      setDrift(data);
    } catch (err: any) {
      console.error('Failed to load drift status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrift(simulateShift);
  }, [simulateShift]);

  return (
    <div className="space-y-6">
      {/* Overview & Controls */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Continuous Covariate Shift & Drift Monitor</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Statistical distribution validation using two-sample Kolmogorov-Smirnov tests and Population Stability Index (PSI).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSimulateShift(!simulateShift)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border btn-tactile flex items-center space-x-1.5 ${
              simulateShift
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-zinc-800 text-zinc-300 border-white/[0.08] hover:bg-zinc-700'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${simulateShift ? 'text-amber-400' : 'text-zinc-400'}`} />
            <span>{simulateShift ? 'Simulating Drift (Apnea Cohort)' : 'Simulate Covariate Shift'}</span>
          </button>

          <button
            onClick={() => fetchDrift()}
            disabled={loading}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/[0.08] btn-tactile disabled:opacity-50"
            title="Refresh Drift Analysis"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Drift Status Banner */}
      {drift && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            drift.overall_drift_detected
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center space-x-3">
            {drift.overall_drift_detected ? (
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            )}
            <div>
              <div className="text-sm font-semibold text-white">
                {drift.overall_drift_detected
                  ? 'Covariate Shift Warning — Drift Detected'
                  : 'Distribution Integrity Verified — No Shift Detected'}
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                {drift.overall_drift_detected
                  ? 'Incoming biosignal distributions deviate significantly from the SaYoPillow training baseline (p < 0.05 or PSI >= 0.25). Automated retraining recommended.'
                  : 'All physiological feature distributions remain consistent with the clinical baseline.'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 font-mono">
            <span className="text-[10px] text-zinc-400 block uppercase">Drift Score</span>
            <span
              className={`text-lg font-bold ${
                drift.overall_drift_detected ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {(drift.drift_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Feature-by-Feature Statistical Drift Grid */}
      {drift && (
        <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-white">Feature Kolmogorov-Smirnov & PSI Breakdown</h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Sample Window: {drift.sample_size} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] border-b border-white/[0.06]">
                <tr>
                  <th className="p-3">Feature</th>
                  <th className="p-3">KS Statistic</th>
                  <th className="p-3">KS p-value</th>
                  <th className="p-3">PSI Index</th>
                  <th className="p-3">Baseline Mean (Std)</th>
                  <th className="p-3">Production Mean (Std)</th>
                  <th className="p-3 text-right">Drift Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {drift.features.map((f) => {
                  const isDrifting = f.ks_drift || f.psi_drift;
                  return (
                    <tr key={f.feature} className="hover:bg-zinc-800/20 font-mono text-[11px]">
                      <td className="p-3">
                        <span className="font-sans font-medium text-white">{f.display_name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono block">token: {f.feature}</span>
                      </td>
                      <td className="p-3 text-zinc-200">{f.ks_statistic.toFixed(4)}</td>
                      <td className="p-3">
                        <span
                          className={f.ks_pvalue < 0.05 ? 'text-rose-400 font-semibold' : 'text-zinc-300'}
                        >
                          {f.ks_pvalue < 0.0001 ? '< 0.0001' : f.ks_pvalue.toFixed(4)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            f.psi >= 0.25
                              ? 'text-rose-400 font-semibold'
                              : f.psi >= 0.1
                              ? 'text-amber-400'
                              : 'text-zinc-300'
                          }
                        >
                          {f.psi.toFixed(4)}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400">
                        {f.baseline_mean.toFixed(1)} <span className="text-zinc-600">({f.baseline_std.toFixed(1)})</span>
                      </td>
                      <td className="p-3 text-zinc-200">
                        {f.current_mean.toFixed(1)} <span className="text-zinc-600">({f.current_std.toFixed(1)})</span>
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            isDrifting
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isDrifting ? 'Drifting' : 'Stable'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
