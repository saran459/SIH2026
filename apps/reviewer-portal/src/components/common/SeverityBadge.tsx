import React from 'react';
import { FindingSeverity } from '../../types';

interface Props {
  severity: FindingSeverity | string;
}

export const SeverityBadge: React.FC<Props> = ({ severity }) => {
  const getStyle = () => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300 font-semibold';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-medium';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 font-medium';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-200 font-normal';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${getStyle()}`}>
      {severity}
    </span>
  );
};
