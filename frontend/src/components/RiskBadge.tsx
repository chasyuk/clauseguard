import React from 'react';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
}

const BADGE_CLASSES: Record<RiskLevel, string> = {
  HIGH: 'border-risk-highBorder bg-risk-highBg text-risk-highText',
  MEDIUM: 'border-risk-medBorder bg-risk-medBg text-risk-medText',
  LOW: 'border-risk-lowBorder bg-risk-lowBg text-risk-lowText',
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const { t } = useLanguage();

  const icon =
    level === 'HIGH' ? (
      <AlertOctagon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    ) : level === 'MEDIUM' ? (
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    ) : (
      <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    );

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${BADGE_CLASSES[level]}`}
    >
      {icon}
      <span>{t.extraction.severityLabels[level]}</span>
    </span>
  );
};
