import React, { useState } from 'react';
import { ModelRecord } from '../types';
import { api } from '../services/api';
import { Award, CheckCircle, Cpu, RefreshCw } from 'lucide-react';

interface ModelRegistryViewProps {
  models: ModelRecord[];
  onRefresh: () => void;
}

export const ModelRegistryView: React.FC<ModelRegistryViewProps> = ({ models, onRefresh }) => {
  const [promotingKey, setPromotingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePromote = async (key: string) => {
    setPromotingKey(key);
    setSuccessMsg(null);
    try {
      await api.promoteModel(key, 'Production');
      setSuccessMsg(`Model '${key}' successfully promoted to Production Champion.`);
      onRefresh();
    } catch (err: any) {
      alert(`Promotion failed: ${err.message}`);
    } finally {
      setPromotingKey(null);
    }
  };

  const champion = models.find((m) => m.is_champion);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Model Registry & Promotion Gate</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Champion/Challenger governance with automated test ratchet validation and stage promotion.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-white/[0.08] btn-tactile flex items-center space-x-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Registry</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Champion Spotlight Card */}
      {champion && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 space-y-3 relative overflow-hidden">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Active Production Champion
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">{champion.name}</h3>
              <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 mt-1">
                <span>Version: {champion.version}</span>
                <span>•</span>
                <span className="capitalize">Framework: {champion.framework}</span>
                <span>•</span>
                <span className="text-emerald-400">Stage: {champion.stage}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 font-mono block">Test F1-Score</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {(champion.test_f1 * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 font-mono block">Test Accuracy</span>
                <span className="text-xl font-bold font-mono text-white">
                  {(champion.test_accuracy * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Models Table */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-white tracking-tight">Evaluated Architecture Catalog</h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">{models.length} models tracked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] border-b border-white/[0.06]">
              <tr>
                <th className="p-3">Model</th>
                <th className="p-3">Framework</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Train Acc</th>
                <th className="p-3">Test Acc</th>
                <th className="p-3">Test F1</th>
                <th className="p-3">Precision</th>
                <th className="p-3">Recall</th>
                <th className="p-3">Fit Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {models.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-800/20 font-mono text-[11px]">
                  <td className="p-3">
                    <div className="font-sans font-medium text-white flex items-center space-x-1.5">
                      <span>{m.name}</span>
                      {m.is_champion && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px]">
                          Champion
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">key: {m.key} • v{m.version}</span>
                  </td>
                  <td className="p-3 text-zinc-300 capitalize">{m.framework}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        m.stage === 'Production'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {m.stage}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-300">{(m.train_accuracy * 100).toFixed(1)}%</td>
                  <td className="p-3 text-white font-semibold">{(m.test_accuracy * 100).toFixed(1)}%</td>
                  <td className="p-3 text-emerald-400 font-semibold">{(m.test_f1 * 100).toFixed(1)}%</td>
                  <td className="p-3 text-zinc-300">{(m.test_precision * 100).toFixed(1)}%</td>
                  <td className="p-3 text-zinc-300">{(m.test_recall * 100).toFixed(1)}%</td>
                  <td className="p-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        m.fit_status === 'Optimal'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : m.fit_status === 'Overfit'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {m.fit_status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {m.is_champion ? (
                      <span className="text-zinc-500 text-[10px] italic">Active</span>
                    ) : (
                      <button
                        onClick={() => handlePromote(m.key)}
                        disabled={promotingKey === m.key}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-300 text-[10px] font-medium border border-white/[0.08] btn-tactile disabled:opacity-50"
                      >
                        {promotingKey === m.key ? 'Promoting...' : 'Promote to Champion'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
