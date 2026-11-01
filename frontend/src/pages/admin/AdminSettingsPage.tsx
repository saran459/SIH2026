import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import {
  Settings,
  Database,
  Shield,
  Save,
  CheckCircle2,
  Calendar,
  Layers,
  Cpu,
  Lock
} from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [settings, setSettings] = useState({
    academicYear: '2025-2026',
    portalLockDate: '2025-06-30',
    maxFileSizeMb: 15,
    maintenanceMode: false,
    ocrEngine: 'Tesseract + AICTE LayoutParser',
    llmModel: 'Evidence-First Policy RAG (Gemini 2.5 Flash)'
  });

  const handleSave = () => {
    showToast('success', 'System Parameters Updated', 'National portal configurations have been saved.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
          <Settings className="w-4 h-4" />
          System Configuration
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Portal Parameters & Engine Settings</h1>
        <p className="text-sm text-slate-600 mt-1">
          Global regulatory parameters, academic cycle timelines, AI OCR engine, and infrastructure settings.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-700" />
          Academic Cycle & Portal Windows
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-600 font-semibold block mb-1">Active Approval Academic Year</label>
            <input
              type="text"
              value={settings.academicYear}
              onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-slate-600 font-semibold block mb-1">Approval Window Final Submission Cutoff</label>
            <input
              type="date"
              value={settings.portalLockDate}
              onChange={(e) => setSettings({ ...settings, portalLockDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-slate-600 font-semibold block mb-1">Maximum Document Upload Size (MB)</label>
            <input
              type="number"
              value={settings.maxFileSizeMb}
              onChange={(e) => setSettings({ ...settings, maxFileSizeMb: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
            />
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2 pt-2">
          <Cpu className="w-4 h-4 text-purple-700" />
          AI & Microservice Engine Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Document OCR & Extraction</span>
            <div className="font-bold text-slate-800 mt-0.5">{settings.ocrEngine}</div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-2">
              <CheckCircle2 className="w-3 h-3" /> Operational (100% Health)
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Policy Assistant & RAG Engine</span>
            <div className="font-bold text-slate-800 mt-0.5">{settings.llmModel}</div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-2">
              <CheckCircle2 className="w-3 h-3" /> Operational (Embeddings Active)
            </span>
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2 pt-2">
          <Lock className="w-4 h-4 text-purple-700" />
          Portal Access Locks
        </h3>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
            <div>
              <span className="font-bold text-slate-800 block">System Maintenance Mode</span>
              <span className="text-slate-500 text-[11px]">Temporarily restrict institution portal submissions for scheduled database maintenance</span>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded-sm focus:ring-purple-500"
            />
          </label>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Apply Portal Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
