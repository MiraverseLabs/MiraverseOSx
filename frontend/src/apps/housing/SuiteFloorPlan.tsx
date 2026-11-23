import React from 'react';
import type { HomeArea } from '../../gameplay/Housing';

const AREAS: { id: HomeArea; label: string; detail: string; x: string; y: string }[] = [
  { id: 'rest', label: 'Rest', detail: 'Bedroom', x: '28%', y: '35%' },
  { id: 'study', label: 'Study', detail: 'Window desk', x: '76%', y: '29%' },
  { id: 'lounge', label: 'Unwind', detail: 'Sitting room', x: '70%', y: '70%' },
  { id: 'keepsakes', label: 'Keepsakes', detail: 'Your collection', x: '26%', y: '79%' },
];
export default function SuiteFloorPlan({ area, onSelect, installed }: { area: HomeArea; onSelect: (area: HomeArea) => void; installed: string[] }) {
  return <div className="myhome-plan">
    <svg viewBox="0 0 640 500" aria-hidden="true">
      <defs><pattern id="suite-floor" width="40" height="80" patternUnits="userSpaceOnUse"><path d="M0 0H40V80H0ZM0 40H40M20 0V40" fill="none" stroke="currentColor" strokeOpacity=".07" /></pattern><pattern id="suite-rug" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0L12 12M-6 6L6 18" stroke="#d2b99a" strokeWidth="1"/></pattern></defs>
      <rect x="28" y="24" width="584" height="452" rx="4" fill="#e9decc" />
      <rect x="38" y="34" width="564" height="432" fill="url(#suite-floor)" />
      <path d="M28 476V24H612V476H370M285 476H28M292 24V286M292 350V476" fill="none" stroke="#777d68" strokeWidth="9" />
      <path d="M65 24H240M344 24H553" stroke="#bdd3cc" strokeWidth="13" />
      <path d="M65 20H240M344 20H553" stroke="#f8fbf7" strokeWidth="3" />
      <rect x="62" y="68" width="180" height="190" rx="9" fill="#b2bba3" stroke="#737e67" strokeWidth="2" />
      <rect x="73" y="79" width="158" height="45" rx="7" fill="#faf6ec" />
      <path d="M63 137H241V249H63Z" fill={installed.includes('mattress') ? '#8c9a83' : '#c7c8ae'} />
      <path d="M78 151H226M78 161H226" stroke="#f3ead9" strokeWidth="2" />
      <rect x="250" y="81" width="24" height="37" rx="4" fill="#a88a67" />
      <circle cx="262" cy="96" r="9" fill={installed.includes('aura_lamp') ? '#f2cf7d' : '#e6dcc2'} />
      <rect x="368" y="59" width="193" height="63" rx="6" fill="#ac8865" stroke="#896d50" strokeWidth="2" />
      <rect x="386" y="70" width="49" height="32" rx="2" fill="#e7e8dc" />
      <path d="M457 73L488 78V105L457 100Z" fill="#f6efdf" /><path d="M489 78L519 73V100L489 105Z" fill="#fffaf0" />
      <rect x="442" y="127" width="53" height="42" rx="14" fill={installed.includes('desk') ? '#6f826d' : '#a1aa94'} />
      <rect x="342" y="257" width="221" height="166" rx="14" fill="#f0e5ce" />
      <rect x="342" y="257" width="221" height="166" rx="14" fill="url(#suite-rug)" opacity=".5" />
      <rect x="366" y="362" width="170" height="52" rx="13" fill="#899b83" stroke="#6c7e66" strokeWidth="2" />
      <path d="M385 371V403M450 371V403M518 371V403" stroke="#d6decc" strokeWidth="2" />
      <ellipse cx="451" cy="320" rx="42" ry="26" fill="#b8926d" /><ellipse cx="451" cy="315" rx="42" ry="26" fill="#d2b38b" />
      {installed.includes('seating') && <rect x="548" y="286" width="40" height="60" rx="12" fill="#bda386" />}
      <rect x="62" y="349" width={installed.includes('storage') ? 193 : 149} height="39" rx="4" fill="#ab8966" stroke="#8a6d50" strokeWidth="2" />
      <path d="M87 356V381M127 356V381M165 356V381" stroke="#e6d5b7" strokeWidth="3" />
      <circle cx="561" cy="206" r="24" fill="#d3bea1" /><path d="M560 218V176M560 197Q529 171 543 166Q564 164 560 197M560 191Q584 160 586 181Q581 199 560 199" fill="#788b67" stroke="#627a55" strokeWidth="2" />
      <path d="M285 476V393Q367 393 367 476" fill="none" stroke="#b4a58a" strokeWidth="2" strokeDasharray="4 5" />
      {installed.includes('banner') && <path d="M40 274H68V320L54 311L40 320Z" fill="#9d795e" />}
      {installed.includes('dock') && <rect x="532" y="72" width="17" height="30" rx="3" fill="#4d625b" />}
      {installed.includes('compartment') && <rect x="73" y="421" width="70" height="24" fill="#ad9273" stroke="#846e53" strokeDasharray="3 3" />}
    </svg>
    {AREAS.map(item => <button key={item.id} className="myhome-plan-point" style={{ left: item.x, top: item.y }} aria-pressed={area === item.id} onClick={() => onSelect(item.id)}><span>{item.label}</span><small>{item.detail}</small></button>)}
    <span className="myhome-plan-caption">Suite 4B · select an area to settle in</span>
  </div>;
}
