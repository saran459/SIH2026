import React, { useState } from 'react';
import { DigitalTwinData, WhatIfScenarioResult } from '../../types';
import { api } from '../../services/api';
import { ScoreGauge } from '../common/ScoreGauge';
import {
  Sparkles,
  RotateCcw,
  Sliders,
  CheckSquare,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface Props {
  data: DigitalTwinData;
  onRefreshData?: () => void;
}

export const WhatIfSimulator: React.FC<Props> = ({ data, onRefreshData }) => {
  const [resolvedFindingIds, setResolvedFindingIds] = useState<number[]>([]);
  const [uploadMissingDocs, setUploadMissingDocs] = useState(false);
  const [respondCorrections, setRespondCorrections] = useState(false);
  const [simulatedFaculty, setSimulatedFaculty] = useState<number>(40);
  const [simulatedScoreResult, setSimulatedScoreResult] = useState<WhatIfScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggleFinding = (id: number) => {
    const updated = resolvedFindingIds.includes(id)
      ? resolvedFindingIds.filter((item) => item !== id)
      : [...resolvedFindingIds, id];
    setResolvedFindingIds(updated);
    triggerSimulation(updated, uploadMissingDocs, respondCorrections, simulatedFaculty);
  };

  const handleToggleMissingDocs = (checked: boolean) => {
    setUploadMissingDocs(checked);
    triggerSimulation(resolvedFindingIds, checked, respondCorrections, simulatedFaculty);
  };

  const handleToggleCorrections = (checked: boolean) => {
    setRespondCorrections(checked);
    triggerSimulation(resolvedFindingIds, uploadMissingDocs, checked, simulatedFaculty);
  };

  const handleFacultyChange = (val: number) => {
    setSimulatedFaculty(val);
    triggerSimulation(resolvedFindingIds, uploadMissingDocs, respondCorrections, val);
  };

  const triggerSimulation = async (
    findingIds: number[],
    missingDocs: boolean,
    corrections: boolean,
    faculty: number
  ) => {
    setLoading(true);
    try {
      const res = await api.simulateWhatIf(data.application_id, {
        resolved_finding_ids: findingIds,
        simulated_upload_missing_docs: missingDocs,
        simulated_respond_to_corrections: corrections,
        simulated_faculty_count: faculty
      });
      setSimulatedScoreResult(res);
    } catch (e) {
      console.error('Simulation failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResolvedFindingIds([]);
    setUploadMissingDocs(false);
    setRespondCorrections(false);
    setSimulatedFaculty(40);
    setSimulatedScoreResult(null);
  };

  const currentScore = data.current_score;
  const simScore = simulatedScoreResult ? simulatedScoreResult.simulated_score : currentScore;
  const scoreDelta = simulatedScoreResult ? simulatedScoreResult.score_delta : 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-150">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Sparkles className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-slate-900">
              What-If Readiness Simulator (Digital Twin)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Statutory Sandbox
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulate corrective actions in real time. Testing scenarios does not alter saved institutional records or audit logs.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Simulation</span>
        </button>
      </div>

      {/* Simulator Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Left: Interactive Scenario Controls */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Interactive Scenario Levers</span>
          </div>

          {/* Quick Scenario Toggles */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={uploadMissingDocs}
                onChange={(e) => handleToggleMissingDocs(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div className="flex-1 text-xs">
                <span className="font-bold text-slate-900 block">
                  Simulate Uploading Missing Documents (+20 Pts)
                </span>
                <span className="text-[11px] text-slate-500">
                  Simulates providing certified Fire Safety NOC & Building Plan Approval
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={respondCorrections}
                onChange={(e) => handleToggleCorrections(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div className="flex-1 text-xs">
                <span className="font-bold text-slate-900 block">
                  Simulate Resolving Reviewer Clarifications (+15 Pts)
                </span>
                <span className="text-[11px] text-slate-500">
                  Simulates submitting explanatory responses to all active scrutiny notices
                </span>
              </div>
            </label>
          </div>

          {/* Individual Finding Toggles */}
          {data.finding_impacts && data.finding_impacts.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Simulate Resolving Specific Open Findings:
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {data.finding_impacts.map((impact) => {
                  const isChecked = resolvedFindingIds.includes(impact.finding_id);
                  return (
                    <label
                      key={impact.finding_id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleFinding(impact.finding_id)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                        />
                        <span className="font-medium text-slate-800 line-clamp-1">{impact.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        +{impact.penalty_points} Pts
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Faculty Strength Slider */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800">
                Simulated Faculty Strength
              </span>
              <span className="font-bold text-blue-700 text-sm">{simulatedFaculty} members</span>
            </div>
            <input
              type="range"
              min={20}
              max={60}
              value={simulatedFaculty}
              onChange={(e) => handleFacultyChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>20 (Deficient)</span>
              <span>30 (Min Norm)</span>
              <span>45+ (Cadre Optimal)</span>
            </div>
          </div>
        </div>

        {/* Right: Real-Time Comparison Gauge & Projected Outcome */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Simulated Score Projection
              </span>
              {scoreDelta > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                  <TrendingUp className="w-3.5 h-3.5" /> +{scoreDelta} Points
                </span>
              )}
            </div>

            {/* Side-by-side Score Meters */}
            <div className="grid grid-cols-2 gap-4 text-center my-4">
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-400 uppercase block mb-2">
                  Current Readiness
                </span>
                <span className="text-3xl font-extrabold text-slate-200">{currentScore}%</span>
                <span className="block text-[11px] text-slate-400 mt-1">{data.status_label}</span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-950/60 border border-blue-800/80 ring-1 ring-blue-500/40">
                <span className="text-[11px] font-semibold text-blue-300 uppercase block mb-2">
                  Simulated Readiness
                </span>
                <span className="text-3xl font-extrabold text-blue-400">{simScore}%</span>
                <span className="block text-[11px] text-blue-200 mt-1 font-semibold">
                  {simScore >= 85 ? 'Ready for EOA' : simScore >= 60 ? 'Deficiencies Remain' : 'Non-Compliant'}
                </span>
              </div>
            </div>

            {/* Projected Next Steps */}
            <div className="mt-5 space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Projected Impact:</span>
              <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                {simulatedScoreResult?.suggested_next_steps ? (
                  simulatedScoreResult.suggested_next_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{step}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-start gap-2 text-slate-400 italic">
                    Toggle scenarios on the left to project readiness improvements.
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 mt-6 text-[10px] text-slate-500 text-center">
            Isolated digital twin sandbox model. No persistent application data modified.
          </div>
        </div>
      </div>
    </div>
  );
};
