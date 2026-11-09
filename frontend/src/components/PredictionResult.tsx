import React, { useState } from 'react';
import { PredictionResponse, ExplainResponse } from '../types';
import { api } from '../services/api';
import { ShieldCheck, TrendingUp, Check, Clock, Award } from 'lucide-react';

interface PredictionResultProps {
  prediction: PredictionResponse | null;
  explanation: ExplainResponse | null;
  loading: boolean;
}

const STRESS_BADGES: Record<number, { title: string; color: string; bg: string; border: string; desc: string }> = {
  0: {
    title: 'Low / Normal Stress',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    desc: 'Physiological markers reflect deep parasympathetic recovery and stabilized autonomic homeostasis.',
  },
  1: {
    title: 'Medium Low Stress',
    color: 'text-teal-300',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    desc: 'Mild nocturnal arousal detected with preserved blood oxygenation and minimal limb restlessness.',
  },
  2: {
    title: 'Medium Stress',
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    desc: 'Noticeable sympathetic excitation with fragmented REM duration and elevated respiration rate.',
  },
  3: {
    title: 'Medium High Stress',
    color: 'text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    desc: 'Significant nocturnal distress: restricted sleep hours, frequent snoring, and elevated core temperature.',
  },
  4: {
    title: 'High / Critical Stress',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    desc: 'Severe autonomic strain: acute hypoxia (SpO2 drops), persistent tachycardia, and intense motor restlessness.',
  },
};

export const PredictionResult: React.FC<PredictionResultProps> = ({ prediction, explanation, loading }) => {
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<boolean>(false);

  if (!prediction) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] text-center text-zinc-500 text-xs">
        {loading ? 'Executing model inference...' : 'Configure biosignal parameters on the left and run inference to inspect model classification.'}
      </div>
    );
  }

  const badge = STRESS_BADGES[prediction.predicted_class] || STRESS_BADGES[0];

  const handleFeedback = async () => {
    if (!prediction.prediction_id) return;
    setFeedbackSubmitting(true);
    try {
      await api.submitFeedback(prediction.prediction_id, prediction.predicted_class, 'Confirmed by clinician in UI');
      setFeedbackSent(true);
    } catch {
      // ignore
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-5">
      {/* Classification Card */}
      <div className={`p-4 rounded-xl border ${badge.bg} ${badge.border} space-y-2 relative overflow-hidden`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Model Inference Result</span>
          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-zinc-400">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>{prediction.latency_ms} ms</span>
          </div>
        </div>

        <div className="flex items-baseline space-x-3">
          <div className={`text-xl font-bold tracking-tight ${badge.color}`}>
            {badge.title}
          </div>
          <span className="text-xs font-mono font-medium text-zinc-300">
            Class {prediction.predicted_class}
          </span>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">{badge.desc}</p>

        {/* Confidence Progress Bar */}
        <div className="pt-2">
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-zinc-400">Classification Confidence</span>
            <span className="font-semibold text-white">{(prediction.confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-900/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${Math.max(10, prediction.confidence * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Multi-class Probability Breakdown */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Multi-Class Probability Distribution</span>
        <div className="space-y-1.5">
          {Object.entries(prediction.probabilities).map(([cName, prob]) => {
            const isHighest = prob === prediction.confidence;
            return (
              <div key={cName} className="text-xs space-y-0.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className={isHighest ? 'text-emerald-300 font-medium' : 'text-zinc-400'}>{cName}</span>
                  <span className={isHighest ? 'text-emerald-300 font-semibold' : 'text-zinc-500'}>
                    {(prob * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHighest ? 'bg-emerald-400' : 'bg-zinc-600/40'
                    }`}
                    style={{ width: `${Math.max(2, prob * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SHAP Feature Attribution Waterfall */}
      {explanation && explanation.contributions && (
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-300">
                SHAP Feature Attribution
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Base: {explanation.base_value}</span>
          </div>

          <p className="text-[11px] text-zinc-400">
            Local feature impact driving this prediction relative to expected baseline:
          </p>

          <div className="space-y-1.5 pt-1">
            {explanation.contributions.slice(0, 5).map((item) => {
              const isPositive = item.shap_value >= 0;
              const absVal = Math.min(100, Math.abs(item.shap_value) * 120);
              return (
                <div key={item.feature} className="p-2 rounded-lg bg-zinc-900/50 border border-white/[0.03] space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-zinc-200">{item.display_name}</span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {item.shap_value.toFixed(3)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 flex overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.max(5, absVal)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ground Truth Feedback Action */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-zinc-400 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
          <span>Clinical Validation</span>
        </div>
        <button
          onClick={handleFeedback}
          disabled={feedbackSent || feedbackSubmitting}
          className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-white/[0.08] btn-tactile flex items-center space-x-1.5 disabled:opacity-60"
        >
          {feedbackSent ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Ground Truth Saved</span>
            </>
          ) : (
            <>
              <Award className="w-3 h-3 text-zinc-400" />
              <span>{feedbackSubmitting ? 'Recording...' : 'Confirm Label'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
