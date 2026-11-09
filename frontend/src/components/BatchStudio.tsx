import React, { useState } from 'react';
import { BatchPredictResponse, ModelRecord } from '../types';
import { api } from '../services/api';
import { UploadCloud, Download, CheckCircle, Cpu, AlertCircle } from 'lucide-react';

interface BatchStudioProps {
  models: ModelRecord[];
  championKey: string;
}

export const BatchStudio: React.FC<BatchStudioProps> = ({ models, championKey }) => {
  const [selectedModel, setSelectedModel] = useState<string>(championKey || 'random_forest');
  const [batchResult, setBatchResult] = useState<BatchPredictResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError(null);
    try {
      const res = await api.predictCsv(file, selectedModel);
      setBatchResult(res);
    } catch (err: any) {
      setError(err.message || 'Batch inference failed on file');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleBatch = async () => {
    setLoading(true);
    setError(null);
    setFileName('sample_clinical_cohort.csv');

    // Create 10 sample biosignal records across stress spectrum
    const sampleCohort = [
      { sr: 48.0, rr: 16.0, t: 97.2, lm: 5.0, bo: 96.5, rem: 70.0, sh: 8.5, hr: 52.0 },
      { sr: 50.0, rr: 17.5, t: 98.0, lm: 6.0, bo: 96.0, rem: 74.0, sh: 8.0, hr: 54.0 },
      { sr: 58.0, rr: 19.0, t: 95.8, lm: 9.0, bo: 94.5, rem: 82.0, sh: 6.5, hr: 58.0 },
      { sr: 60.0, rr: 20.0, t: 96.0, lm: 10.0, bo: 95.0, rem: 85.0, sh: 7.0, hr: 60.0 },
      { sr: 72.0, rr: 21.0, t: 93.5, lm: 11.0, bo: 91.5, rem: 90.0, sh: 4.5, hr: 63.0 },
      { sr: 75.0, rr: 22.0, t: 93.0, lm: 12.0, bo: 91.0, rem: 92.0, sh: 4.0, hr: 65.0 },
      { sr: 88.0, rr: 24.0, t: 91.0, lm: 14.5, bo: 88.5, rem: 96.0, sh: 1.5, hr: 70.0 },
      { sr: 90.0, rr: 25.0, t: 90.5, lm: 15.0, bo: 88.0, rem: 98.0, sh: 1.2, hr: 72.0 },
      { sr: 96.0, rr: 26.5, t: 85.5, lm: 17.0, bo: 82.5, rem: 100.0, sh: 0.2, hr: 75.0 },
      { sr: 98.0, rr: 27.5, t: 84.5, lm: 18.0, bo: 80.0, rem: 102.0, sh: 0.0, hr: 78.0 },
    ];

    try {
      const res = await api.predictBatch(sampleCohort, selectedModel);
      setBatchResult(res);
    } catch (err: any) {
      setError(err.message || 'Batch scoring failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadResultsCSV = () => {
    if (!batchResult) return;
    const headers = ['Record_ID', 'Predicted_Class', 'Class_Name', 'Confidence', 'Latency_ms'];
    const rows = batchResult.predictions.map((p, idx) => [
      idx + 1,
      p.predicted_class,
      `"${p.class_name}"`,
      p.confidence,
      p.latency_ms,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stressguard_predictions_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Batch Cohort Biosignal Ingestion</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Upload patient polysomnography records for high-throughput batch classification.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-zinc-900 border border-white/[0.1] text-zinc-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              >
                {models.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleLoadSampleBatch}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-white/[0.08] btn-tactile disabled:opacity-50"
            >
              Load Demo 10-Cohort
            </button>
          </div>
        </div>

        {/* Drag & Drop File Upload Area */}
        <label className="border-2 border-dashed border-zinc-700/80 hover:border-emerald-500/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-900/20">
          <UploadCloud className="w-8 h-8 text-emerald-400 mb-2" />
          <span className="text-xs font-medium text-zinc-200">
            {fileName ? `File selected: ${fileName}` : 'Drop SaYoPillow-formatted CSV or click to browse'}
          </span>
          <span className="text-[11px] font-mono text-zinc-500 mt-1">
            Required headers: sr, rr, t, lm, bo, rem, sh, hr
          </span>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
        </label>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Batch Results View */}
      {batchResult && (
        <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                Inference Complete — {batchResult.total_samples} Patient Records Scored
              </h3>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-zinc-400">
                Mean Conf: <strong className="text-emerald-400">{(batchResult.mean_confidence * 100).toFixed(1)}%</strong>
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Total Latency: <strong className="text-zinc-200">{batchResult.total_latency_ms} ms</strong>
              </span>
              <button
                onClick={downloadResultsCSV}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs btn-tactile flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Predictions CSV</span>
              </button>
            </div>
          </div>

          {/* Class Distribution Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {Object.entries(batchResult.class_distribution).map(([className, count]) => (
              <div key={className} className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
                <div className="text-[10px] text-zinc-400 font-mono truncate">{className}</div>
                <div className="text-base font-bold text-white mt-0.5">{count}</div>
              </div>
            ))}
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] border-b border-white/[0.06]">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">Predicted Class</th>
                  <th className="p-2.5">Diagnosis Category</th>
                  <th className="p-2.5">Confidence</th>
                  <th className="p-2.5">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {batchResult.predictions.slice(0, 15).map((p, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/20 font-mono text-[11px]">
                    <td className="p-2.5 text-zinc-500">{idx + 1}</td>
                    <td className="p-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                        Level {p.predicted_class}
                      </span>
                    </td>
                    <td className="p-2.5 text-zinc-200 font-sans font-medium">{p.class_name}</td>
                    <td className="p-2.5 text-emerald-400 font-semibold">{(p.confidence * 100).toFixed(1)}%</td>
                    <td className="p-2.5 text-zinc-400">{p.latency_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
