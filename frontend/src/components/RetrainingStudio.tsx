import React, { useState, useEffect } from 'react';
import { PipelineRun } from '../types';
import { api } from '../services/api';
import { GitBranch, Play, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const RetrainingStudio: React.FC = () => {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Hyperparameters
  const [testSize, setTestSize] = useState<number>(0.2);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [rfTrees, setRfTrees] = useState<number>(300);
  const [xgbDepth, setXgbDepth] = useState<number>(6);
  const [mlpEpochs, setMlpEpochs] = useState<number>(200);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const data = await api.listPipelineRuns();
      setRuns(data);
    } catch (err: any) {
      console.error('Failed to fetch pipeline runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleTriggerRetrain = async () => {
    setRunning(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.triggerRetraining({
        test_size: testSize,
        random_state: randomSeed,
        rf_n_estimators: rfTrees,
        xgb_max_depth: xgbDepth,
        mlp_epochs: mlpEpochs,
      });
      setSuccess(`Pipeline Run #${result.run_id} finished successfully. Artifacts serialized.`);
      fetchRuns();
    } catch (err: any) {
      setError(err.message || 'Pipeline execution failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Retraining Configuration Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Automated MLOps Retraining Pipeline</h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">Deterministic Seeds & Ratchet Verification</span>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Trigger an end-to-end retraining run across all 5 architectures (Random Forest, XGBoost, SVM RBF, KNN, PyTorch MLP).
          Executes stratified splitting, k-fold cross validation, artifact serialization, and evaluation metrics update.
        </p>

        {/* Hyperparameter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] space-y-1">
            <label className="text-[11px] text-zinc-400 block font-mono">Test Split Size</label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="0.4"
              value={testSize}
              onChange={(e) => setTestSize(parseFloat(e.target.value))}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] space-y-1">
            <label className="text-[11px] text-zinc-400 block font-mono">Random State Seed</label>
            <input
              type="number"
              value={randomSeed}
              onChange={(e) => setRandomSeed(parseInt(e.target.value))}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] space-y-1">
            <label className="text-[11px] text-zinc-400 block font-mono">RF n_estimators</label>
            <input
              type="number"
              step="50"
              value={rfTrees}
              onChange={(e) => setRfTrees(parseInt(e.target.value))}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] space-y-1">
            <label className="text-[11px] text-zinc-400 block font-mono">XGB max_depth</label>
            <input
              type="number"
              value={xgbDepth}
              onChange={(e) => setXgbDepth(parseInt(e.target.value))}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] space-y-1">
            <label className="text-[11px] text-zinc-400 block font-mono">MLP Epochs</label>
            <input
              type="number"
              step="25"
              value={mlpEpochs}
              onChange={(e) => setMlpEpochs(parseInt(e.target.value))}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleTriggerRetrain}
            disabled={running}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-semibold text-xs tracking-wide shadow-lg shadow-emerald-500/10 btn-tactile flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
            <span>{running ? 'Executing Training Loops & Evaluating Models...' : 'Launch Automated Retraining'}</span>
          </button>
        </div>

        {success && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Historical Pipeline Runs */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white tracking-tight">Experiment Tracking & Pipeline Run History</h3>
          <button
            onClick={fetchRuns}
            disabled={loading}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/[0.06] btn-tactile disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] border-b border-white/[0.06]">
              <tr>
                <th className="p-3">Run ID</th>
                <th className="p-3">Trigger</th>
                <th className="p-3">Train / Test Split</th>
                <th className="p-3">RF Test F1</th>
                <th className="p-3">XGB Test F1</th>
                <th className="p-3">MLP Test F1</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {runs.map((r) => {
                const rfF1 = r.metrics?.random_forest?.test_f1;
                const xgbF1 = r.metrics?.xgboost?.test_f1;
                const mlpF1 = r.metrics?.mlp?.test_f1;
                return (
                  <tr key={r.id} className="hover:bg-zinc-800/20 font-mono text-[11px]">
                    <td className="p-3 font-semibold text-white">#{r.id}</td>
                    <td className="p-3 text-zinc-300 capitalize">{r.trigger_type}</td>
                    <td className="p-3 text-zinc-400">
                      {r.train_samples} / {r.test_samples}
                    </td>
                    <td className="p-3 text-emerald-400 font-semibold">{rfF1 ? `${(rfF1 * 100).toFixed(1)}%` : '—'}</td>
                    <td className="p-3 text-zinc-200">{xgbF1 ? `${(xgbF1 * 100).toFixed(1)}%` : '—'}</td>
                    <td className="p-3 text-zinc-200">{mlpF1 ? `${(mlpF1 * 100).toFixed(1)}%` : '—'}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          r.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'running'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-right text-zinc-500 text-[10px]">
                      {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
