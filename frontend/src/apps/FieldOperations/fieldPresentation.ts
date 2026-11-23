import { FIELD_TARGETS, type FieldSession } from '../../gameplay/FieldOperations';

export const TUNNEL_ART = '/images/field/tunnel-09.png';

export function targetRecorded(session: FieldSession, id: string) {
  return id === 'witness' ? session.interviewed : id === 'seal' ? session.sealed : session.evidence.includes(id);
}

export function targetLocked(session: FieldSession, id: string) {
  return id === 'seal' && (session.evidence.length < 3 || !session.interviewed);
}

export function fieldObjectives(session: FieldSession) {
  return FIELD_TARGETS.map((target, index) => ({
    ...target,
    number: String(index + 1).padStart(2, '0'),
    done: targetRecorded(session, target.id),
    locked: targetLocked(session, target.id),
  }));
}

export function fieldPhase(session: FieldSession, recorded: boolean, reported: boolean, completed: boolean) {
  if (completed) {
    return {
      label: 'Operation complete',
      step: 4,
      instruction: 'Your accepted report and compensation are on file.',
    };
  }
  if (reported) {
    return {
      label: 'Ready for review',
      step: 3,
      instruction: 'Finalize your operation to receive its WORKNET reward.',
    };
  }
  if (recorded) {
    return {
      label: 'Write the report',
      step: 3,
      instruction: 'Connect the source, carrier, location, and containment measures in your report.',
    };
  }
  if (session.sealed) {
    return {
      label: 'Transmit findings',
      step: 2,
      instruction: 'Record the field dossier in WORKNET before writing your report.',
    };
  }
  if (session.evidence.length === 3 && session.interviewed) {
    return {
      label: 'Deploy containment',
      step: 2,
      instruction: 'Approach the containment console. Deploy Hazmat-01 and Patrol-12 under SealLockCrypt.',
    };
  }
  return {
    label: 'Follow the signal',
    step: 1,
    instruction:
      session.evidence.length === 3
        ? 'Interview technician Iona to complete the source account.'
        : 'Inspect the relay, service terminal, and conduit. Speak with technician Iona.',
  };
}
