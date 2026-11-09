import React, { useState, useEffect } from 'react';
import { APIKey, CreatedAPIKey } from '../types';
import { api } from '../services/api';
import { Shield, Key, Copy, Check, Trash2, Code2, AlertCircle } from 'lucide-react';

export const ApiKeyManager: React.FC = () => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [keyName, setKeyName] = useState<string>('Edge Medical Ingestion');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<CreatedAPIKey | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const data = await api.listApiKeys();
      setKeys(data);
    } catch (err: any) {
      console.error('Failed to fetch API keys:', err);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await api.createApiKey(keyName);
      setNewlyCreatedKey(created);
      fetchKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to create key');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this API key? Any active pipelines will lose access.')) return;
    try {
      await api.revokeApiKey(id);
      fetchKeys();
    } catch (err: any) {
      alert(`Revocation failed: ${err.message}`);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const curlSnippet = `curl -X POST http://localhost:8000/api/v1/predict \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${newlyCreatedKey?.key || 'sk_live_your_api_key_here'}" \\
  -d '{
    "features": {
      "sr": 65.0,
      "rr": 20.0,
      "t": 98.0,
      "lm": 8.0,
      "bo": 96.0,
      "rem": 80.0,
      "sh": 7.0,
      "hr": 70.0
    }
  }'`;

  return (
    <div className="space-y-6">
      {/* Create Key Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] space-y-4">
        <div className="flex items-center space-x-2 border-b border-white/[0.06] pb-3">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Developer API Keys & Multi-Tenant Access</h2>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Generate scoped API keys for programmatic inference from IoT wearables, medical edge devices, or automated pipelines.
        </p>

        <form onSubmit={handleCreateKey} className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Key Name (e.g. Polysomnography Gateway)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            className="flex-1 min-w-[240px] bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs btn-tactile flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{loading ? 'Generating...' : 'Create API Key'}</span>
          </button>
        </form>

        {newlyCreatedKey && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300">
                New API Key Generated — Store this securely:
              </span>
              <button
                onClick={() => handleCopy(newlyCreatedKey.key)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-mono flex items-center space-x-1 btn-tactile"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-black/60 font-mono text-xs text-emerald-200 break-all select-all border border-emerald-500/20">
              {newlyCreatedKey.key}
            </div>
            <p className="text-[10px] text-zinc-400">
              For security, the full key is only displayed once and stored hashed (SHA-256) in the database.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Active Keys Table */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white tracking-tight">Active API Credentials</h3>
          <span className="text-[11px] font-mono text-zinc-400">{keys.length} keys active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] border-b border-white/[0.06]">
              <tr>
                <th className="p-3">Key Name</th>
                <th className="p-3">Prefix</th>
                <th className="p-3">Created</th>
                <th className="p-3">Last Used</th>
                <th className="p-3 text-right">Revoke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-zinc-500 text-xs">
                    No active API keys found. Generate one above to begin programmatic integration.
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="hover:bg-zinc-800/20 font-mono text-[11px]">
                    <td className="p-3 font-sans font-medium text-white">{k.name}</td>
                    <td className="p-3 text-emerald-400">{k.key_prefix}...</td>
                    <td className="p-3 text-zinc-400">
                      {new Date(k.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-zinc-400">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Revoke Key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Integration Snippet */}
      <div className="glass-panel p-5 rounded-2xl border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-white tracking-tight">cURL Integration Example</h3>
          </div>
          <button
            onClick={() => handleCopy(curlSnippet)}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono flex items-center space-x-1"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>Copy Snippet</span>
          </button>
        </div>

        <pre className="p-3.5 rounded-xl bg-zinc-950 font-mono text-[11px] text-zinc-300 overflow-x-auto border border-white/[0.06] leading-relaxed">
          {curlSnippet}
        </pre>
      </div>
    </div>
  );
};
