import React from 'react';
import { PolicyChatbot } from '../components/policy/PolicyChatbot';

export const PolicyAssistantPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Evidence-First Statutory Policy Assistant</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ask questions regarding AICTE Approval Process Handbook (APH) 2026-27 clauses, missing document checklist, and contextual application findings
        </p>
      </div>

      <PolicyChatbot />
    </div>
  );
};
