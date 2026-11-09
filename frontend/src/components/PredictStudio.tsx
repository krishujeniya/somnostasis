import React, { useState, useEffect } from 'react';
import { BiosignalInput, PredictionResponse, ExplainResponse, ModelRecord } from '../types';
import { api } from '../services/api';
import { PredictionResult } from './PredictionResult';
import { Sliders, Sparkles, HelpCircle, Activity, Cpu } from 'lucide-react';

interface PredictStudioProps {
  models: ModelRecord[];
  championKey: string;
  onPredictionLogged?: () => void;
}

interface FeatureMeta {
  key: keyof BiosignalInput;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  description: string;
  normalRange: string;
}

const FEATURES: FeatureMeta[] = [
  {
    key: 'sr',
    label: 'Snoring Rate',
    unit: 'Index',
    min: 40.0,
    max: 100.0,
    step: 0.5,
    description: 'Acoustic measurement of snoring frequency. Elevated values indicate respiratory obstruction.',
    normalRange: '45.0 - 60.0',
  },
  {
    key: 'rr',
    label: 'Respiration Rate',
    unit: 'breaths/min',
    min: 14.0,
    max: 30.0,
    step: 0.5,
    description: 'Frequency of breaths per minute. Elevated rates correlate with sympathetic arousal.',
    normalRange: '14.0 - 18.0',
  },
  {
    key: 't',
    label: 'Body Temperature',
    unit: '°F',
    min: 84.0,
    max: 100.0,
    step: 0.1,
    description: 'Core body temperature. Physiological cooling is critical for restorative slow-wave sleep.',
    normalRange: '97.0 - 99.0',
  },
  {
    key: 'lm',
    label: 'Limb Movement Rate',
    unit: 'twitches/min',
    min: 4.0,
    max: 20.0,
    step: 0.5,
    description: 'Twitch rate recorded via accelerometer. High movement signals non-restorative sleep.',
    normalRange: '4.0 - 8.0',
  },
  {
    key: 'bo',
    label: 'Blood Oxygen (SpO2)',
    unit: '%',
    min: 78.0,
    max: 100.0,
    step: 0.1,
    description: 'Blood oxygen saturation percentage. Hypoxic dips prompt cortisol release.',
    normalRange: '95.0 - 100.0',
  },
  {
    key: 'rem',
    label: 'Rapid Eye Movement',
    unit: 'Duration',
    min: 50.0,
    max: 120.0,
    step: 1.0,
    description: 'Duration of REM stages crucial for memory consolidation and psychological regulation.',
    normalRange: '65.0 - 85.0',
  },
  {
    key: 'sh',
    label: 'Sleeping Hours',
    unit: 'hours',
    min: 0.0,
    max: 10.0,
    step: 0.5,
    description: 'Recorded continuous sleep hours. Acute deprivation strongly amplifies physiological stress.',
    normalRange: '7.0 - 9.0',
  },
  {
    key: 'hr',
    label: 'Heart Rate',
    unit: 'BPM',
    min: 50.0,
    max: 95.0,
    step: 1.0,
    description: 'Nocturnal resting pulse. High baseline rate reflects autonomic cardiovascular stress.',
    normalRange: '50.0 - 65.0',
  },
];

const PRESETS: { name: string; tag: string; values: BiosignalInput }[] = [
  {
    name: 'Restful Sleep',
    tag: 'Level 0 (Low)',
    values: { sr: 48.0, rr: 16.5, t: 97.5, lm: 5.5, bo: 96.5, rem: 72.0, sh: 8.5, hr: 53.0 },
  },
  {
    name: 'Mild Fatigue',
    tag: 'Level 1 (Med-Low)',
    values: { sr: 56.5, rr: 19.2, t: 95.4, lm: 9.2, bo: 94.0, rem: 83.0, sh: 6.4, hr: 58.0 },
  },
  {
    name: 'Fragmented Sleep',
    tag: 'Level 2 (Medium)',
    values: { sr: 73.0, rr: 21.5, t: 93.3, lm: 11.4, bo: 91.3, rem: 91.5, sh: 4.1, hr: 63.5 },
  },
  {
    name: 'High Strain',
    tag: 'Level 3 (Med-High)',
    values: { sr: 86.5, rr: 23.8, t: 90.8, lm: 14.1, bo: 88.8, rem: 97.0, sh: 1.5, hr: 69.0 },
  },
  {
    name: 'Acute Hypoxia / Stress',
    tag: 'Level 4 (High)',
    values: { sr: 96.5, rr: 26.5, t: 85.5, lm: 17.2, bo: 82.5, rem: 100.5, sh: 0.0, hr: 76.0 },
  },
];

export const PredictStudio: React.FC<PredictStudioProps> = ({ models, championKey, onPredictionLogged }) => {
  const [features, setFeatures] = useState<BiosignalInput>(PRESETS[0].values);
  const [selectedModel, setSelectedModel] = useState<string>(championKey || 'random_forest');
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (championKey) setSelectedModel(championKey);
  }, [championKey]);

  // Run initial prediction on load
  useEffect(() => {
    executePrediction(features, selectedModel);
  }, []);

  const executePrediction = async (currentFeatures: BiosignalInput, modelKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const predRes = await api.predictSingle(currentFeatures, modelKey);
      setPrediction(predRes);
      if (onPredictionLogged) onPredictionLogged();

      // Fetch SHAP feature attribution
      const expRes = await api.getExplanation(currentFeatures, modelKey);
      setExplanation(expRes);
    } catch (err: any) {
      setError(err.message || 'Inference call failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSliderChange = (key: keyof BiosignalInput, val: number) => {
    const updated = { ...features, [key]: val };
    setFeatures(updated);
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setFeatures(preset.values);
    executePrediction(preset.values, selectedModel);
  };

  return (
    <div className="space-y-6">
      {/* Preset Banner */}
      <div className="glass-panel-subtle p-3.5 rounded-xl border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-zinc-300">Clinical Archetype Presets:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(preset)}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/[0.06] text-zinc-300 btn-tactile flex items-center space-x-1.5"
            >
              <span>{preset.name}</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-emerald-300/80 font-mono">
                {preset.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Biosignal Controls */}
        <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">Physiological Biosignals</h2>
            </div>
            {/* Model Selector */}
            <div className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  executePrediction(features, e.target.value);
                }}
                className="bg-zinc-900 border border-white/[0.1] text-zinc-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              >
                {models.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name} {m.is_champion ? '⭐ (Champion)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((feat) => {
              const val = features[feat.key];
              return (
                <div
                  key={feat.key}
                  className="p-3 rounded-xl bg-zinc-900/40 border border-white/[0.04] space-y-2 hover:border-white/[0.08] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-medium text-zinc-200">{feat.label}</span>
                      <div className="group relative cursor-help">
                        <HelpCircle className="w-3 h-3 text-zinc-500 hover:text-zinc-300" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 p-2 text-[10px] rounded-lg bg-zinc-950 border border-white/10 text-zinc-300 z-50 shadow-xl pointer-events-none">
                          {feat.description}
                          <div className="mt-1 text-emerald-400 font-mono text-[9px]">Normal: {feat.normalRange}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 font-mono text-xs">
                      <span className="font-semibold text-emerald-400">{val}</span>
                      <span className="text-[10px] text-zinc-500">{feat.unit}</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={feat.min}
                    max={feat.max}
                    step={feat.step}
                    value={val}
                    onChange={(e) => handleSliderChange(feat.key, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />

                  <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                    <span>{feat.min}</span>
                    <span className="text-zinc-500">Ref: {feat.normalRange}</span>
                    <span>{feat.max}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Predict Action Button */}
          <div className="pt-2">
            <button
              onClick={() => executePrediction(features, selectedModel)}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-semibold text-xs tracking-wide shadow-lg shadow-emerald-500/10 btn-tactile flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Executing Real-Time Inference...' : 'Score Biosignals & Compute SHAP'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Prediction & SHAP Explainability Result */}
        <div className="lg:col-span-5">
          <PredictionResult
            prediction={prediction}
            explanation={explanation}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};
