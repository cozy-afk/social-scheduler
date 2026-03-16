'use client';

import { useStore } from '@/lib/store';
import { ChevronDown } from 'lucide-react';

export default function ModelSwitcher() {
  const { models, selectedModelId, setSelectedModelId } = useStore();

  return (
    <div className="relative inline-block">
      <select
        value={selectedModelId || ''}
        onChange={(e) => setSelectedModelId(e.target.value)}
        className="appearance-none bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 pr-8 font-medium text-slate-100 text-sm hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="">Select Model</option>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.profileImage} {model.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
    </div>
  );
}
