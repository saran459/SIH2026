import React from 'react';
import { ApplicationStatus } from '../../types';
import { Clock, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight, RotateCcw } from 'lucide-react';

interface Props {
  status: ApplicationStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const getStyle = () => {
    switch (status) {
      case 'Draft':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case 'Submitted':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <ArrowUpRight className="w-3.5 h-3.5" />
        };
      case 'Under Review':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse',
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case 'Correction Required':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: <AlertTriangle className="w-3.5 h-3.5" />
        };
      case 'Resubmitted':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <RotateCcw className="w-3.5 h-3.5" />
        };
      case 'Approved':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />
        };
      case 'Rejected':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: <XCircle className="w-3.5 h-3.5" />
        };
      default:
        return {
          bg: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: <Clock className="w-3.5 h-3.5" />
        };
    }
  };

  const { bg, icon } = getStyle();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3.5 py-1.5 text-sm font-semibold' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border shadow-xs ${sizeClasses} ${bg}`}>
      {icon}
      <span>{status}</span>
    </span>
  );
};
