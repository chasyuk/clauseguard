import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
}

const BADGE_CLASSES: Record<RiskLevel, string> = {
  HIGH: 'bg-signal text-white',
  MEDIUM: 'bg-[#FACC15] text-forest-deep',
  LOW: 'bg-[#52C48A] text-forest-deep',
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const { lang } = useLanguage();
  const isUk = lang === 'uk';

  const label =
    level === 'HIGH'
      ? isUk
        ? 'Критично'
        : 'Critical'
      : level === 'MEDIUM'
        ? isUk
          ? 'Середньо'
          : 'Medium'
        : isUk
          ? 'Низько'
          : 'Low';

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-bold ${BADGE_CLASSES[level]}`}
    >
      {label}
    </span>
  );
};
