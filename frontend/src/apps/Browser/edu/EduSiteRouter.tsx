import React from 'react';
import { INSTITUTIONS } from '../../../gameplay/Academics';
import CyberiumSite from './CyberiumSite';
import DawnSite from './DawnSite';
import RegentHallSite from './RegentHallSite';
import { eduUrl, parseEduUrl } from './eduRouter';

export default function EduSiteRouter({
  url,
  navigateTab,
}: {
  url: string;
  navigateTab: (url: string, title?: string) => void;
}) {
  const location = parseEduUrl(url);
  if (!location) return null;

  if (!location.valid) {
    const school = INSTITUTIONS.find(s => s.id === location.institution)!;
    return (
      <div style={{ padding: 40, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <h2>Page not found on {school.domain}</h2>
        <p>The requested page does not exist on {school.name}’s website.</p>
        <button onClick={() => navigateTab(eduUrl(school.id, 'home'))}>
          Return to {school.name} Home
        </button>
      </div>
    );
  }

  if (location.institution === 'cyberium') {
    return <CyberiumSite location={location} navigateTab={navigateTab} />;
  }
  if (location.institution === 'dawn') {
    return <DawnSite location={location} navigateTab={navigateTab} />;
  }
  return <RegentHallSite location={location} navigateTab={navigateTab} />;
}
