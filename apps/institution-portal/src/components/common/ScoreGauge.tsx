import React from 'react';

interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ScoreGauge: React.FC<Props> = ({ score, size = 'md', showLabel = true }) => {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));

  const getColor = () => {
    if (normalized >= 85) return { stroke: '#10b981', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (normalized >= 60) return { stroke: '#f59e0b', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    return { stroke: '#ef4444', text: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' };
  };

  const { stroke, text, bg } = getColor();
  const radius = size === 'lg' ? 44 : size === 'sm' ? 24 : 34;
  const strokeWidth = size === 'lg' ? 8 : size === 'sm' ? 4 : 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalized / 100) * circumference;
  const viewBoxSize = (radius + strokeWidth) * 2;

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={viewBoxSize}
          height={viewBoxSize}
          className="transform -rotate-90 transition-all duration-700 ease-out"
        >
          {/* Background circle */}
          <circle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r={radius}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`${size === 'lg' ? 'text-2xl font-bold' : size === 'sm' ? 'text-xs font-semibold' : 'text-base font-bold'} ${text}`}>
            {normalized}%
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={`mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg} ${text}`}>
          {normalized >= 85 ? 'High Readiness' : normalized >= 60 ? 'Moderate Risk' : 'High Risk'}
        </span>
      )}
    </div>
  );
};
