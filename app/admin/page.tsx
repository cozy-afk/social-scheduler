'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import ModelSwitcher from '@/components/ModelSwitcher';
import {
  Lock, Cloud, KeyRound, Check, Cpu,
} from 'lucide-react';

export default function AdminPage() {
  const { s3Config, setS3Config, metaConfig, setMetaConfig } = useStore();

  // S3 form state
  const [s3Bucket,  setS3Bucket]  = useState(s3Config?.bucket          || '');
  const [s3Region,  setS3Region]  = useState(s3Config?.region          || 'us-east-1');
  const [s3Key,     setS3Key]     = useState(s3Config?.accessKeyId     || '');
  const [s3Secret,  setS3Secret]  = useState(s3Config?.secretAccessKey || '');
  const [s3Saved,   setS3Saved]   = useState(false);

  // Meta form state
  const [metaAccountId, setMetaAccountId] = useState(metaConfig?.accountId   || '');
  const [metaToken,     setMetaToken]     = useState(metaConfig?.accessToken  || '');
  const [metaIgUserId,  setMetaIgUserId]  = useState(metaConfig?.igUserId     || '');
  const [metaSaved,     setMetaSaved]     = useState(false);

  const saveS3 = () => {
    setS3Config({ bucket: s3Bucket, region: s3Region, accessKeyId: s3Key, secretAccessKey: s3Secret });
    setS3Saved(true);
    setTimeout(() => setS3Saved(false), 2500);
  };

  const disconnectS3 = () => {
    setS3Config(null);
    setS3Bucket(''); setS3Region('us-east-1'); setS3Key(''); setS3Secret('');
  };

  const saveMeta = () => {
    setMetaConfig({ accountId: metaAccountId, accessToken: metaToken, igUserId: metaIgUserId });
    setMetaSaved(true);
    setTimeout(() => setMetaSaved(false), 2500);
  };

  const disconnectMeta = () => {
    setMetaConfig(null);
    setMetaAccountId(''); setMetaToken(''); setMetaIgUserId('');
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Page header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-sm text-slate-400">
            Accessible only via direct URL — not linked from navigation.
          </p>
        </div>

        {/* S3 Config */}
        <div className="card p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cloud className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-semibold text-white">S3 Bucket</h2>
              {s3Config ? (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400">
                  <Check className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  Not connected
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              Connect your S3 bucket to browse and import content directly into the gallery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-dark">Bucket Name</label>
              <input
                type="text"
                value={s3Bucket}
                onChange={(e) => setS3Bucket(e.target.value)}
                className="input-dark"
                placeholder="my-media-bucket"
              />
            </div>
            <div>
              <label className="label-dark">Region</label>
              <input
                type="text"
                value={s3Region}
                onChange={(e) => setS3Region(e.target.value)}
                className="input-dark"
                placeholder="us-east-1"
              />
            </div>
            <div>
              <label className="label-dark">Access Key ID</label>
              <input
                type="text"
                value={s3Key}
                onChange={(e) => setS3Key(e.target.value)}
                className="input-dark"
                placeholder="AKIAIOSFODNN7EXAMPLE"
              />
            </div>
            <div>
              <label className="label-dark">Secret Access Key</label>
              <input
                type="password"
                value={s3Secret}
                onChange={(e) => setS3Secret(e.target.value)}
                className="input-dark"
                placeholder="••••••••••••••••••••"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={saveS3}
              disabled={!s3Bucket.trim() || !s3Key.trim() || !s3Secret.trim()}
              className={`btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                s3Saved ? 'bg-green-600 hover:bg-green-600' : ''
              }`}
            >
              {s3Saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Connection'}
            </button>
            {s3Config && (
              <button
                onClick={disconnectS3}
                className="text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Meta / Instagram Graph API */}
        <div className="card p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-5 h-5 text-pink-400" />
              <h2 className="text-base font-semibold text-white">Meta / Instagram Graph API</h2>
              {metaConfig ? (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400">
                  <Check className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  Not connected
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              Required for Analytics insights and trend discovery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-dark">Account ID</label>
              <input
                type="text"
                value={metaAccountId}
                onChange={(e) => setMetaAccountId(e.target.value)}
                className="input-dark"
                placeholder="17841400008460056"
              />
            </div>
            <div>
              <label className="label-dark">IG User ID</label>
              <input
                type="text"
                value={metaIgUserId}
                onChange={(e) => setMetaIgUserId(e.target.value)}
                className="input-dark"
                placeholder="17841400008460056"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-dark">Access Token</label>
              <input
                type="password"
                value={metaToken}
                onChange={(e) => setMetaToken(e.target.value)}
                className="input-dark"
                placeholder="EAABsb..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={saveMeta}
              disabled={!metaAccountId.trim() || !metaToken.trim()}
              className={`btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                metaSaved ? 'bg-green-600 hover:bg-green-600' : ''
              }`}
            >
              {metaSaved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Connection'}
            </button>
            {metaConfig && (
              <button
                onClick={disconnectMeta}
                className="text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* LLM Model Selection */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-semibold text-white">LLM Model Selection</h2>
          </div>
          <p className="text-sm text-slate-400">
            Choose which Claude model powers AI features such as caption generation and post suggestions.
            The selected model applies globally to all AI-assisted workflows.
          </p>
          <div className="flex items-center gap-3">
            <ModelSwitcher />
          </div>
        </div>

      </main>
    </div>
  );
}
