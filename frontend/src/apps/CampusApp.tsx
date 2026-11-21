import React, { lazy, Suspense, useEffect, useState } from 'react';
import AcademicPortal from './academic/AcademicPortal';
import AcademicProjectDesk from './academic/AcademicProjectDesk';
import { useOSStore } from '../store/useOSStore';
const MagicPractice = lazy(() => import('./SpellForgeApp'));

export default function CampusApp() {
  const [section, setSection] = useState('overview');
  const request = useOSStore(s => s.workspaceRequests.campus);
  useEffect(() => {
    if (!request) return;
    setSection(request.section === 'magic' ? 'magic' : 'overview');
    useOSStore.getState().consumeWorkspaceRequest('campus', request.revision);
  }, [request]);
  return <section className="consolidated-workspace" aria-label="CAMPUS academic network">
    <nav className="consolidated-tabs" aria-label="Campus sections"><strong>CAMPUS</strong><button aria-pressed={section === 'overview'} onClick={() => setSection('overview')}>Schools and studies</button><button aria-pressed={section === 'magic'} onClick={() => setSection('magic')}>Magic practice</button></nav>
    <div className="consolidated-body">{section === 'magic' ? <><AcademicProjectDesk workspace="compiler"/><Suspense fallback={<p role="status">Opening magic practice…</p>}><MagicPractice/></Suspense></> : <AcademicPortal/>}</div>
  </section>;
}
