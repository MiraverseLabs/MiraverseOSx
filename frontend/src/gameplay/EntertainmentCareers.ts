export type EntertainmentRoleKind = 'artist' | 'staff';

export interface EntertainmentRole {
  id: string;
  title: string;
  kind: EntertainmentRoleKind;
  skills: string[];
}

export interface EntertainmentCareerFamily {
  id: string;
  label: string;
  roles: EntertainmentRole[];
}

const role = (id: string, title: string, kind: EntertainmentRoleKind, skills: string[]): EntertainmentRole => ({ id, title, kind, skills });

export const ENTERTAINMENT_CAREER_FAMILIES: EntertainmentCareerFamily[] = [
  {
    id: 'music',
    label: 'Music',
    roles: [
      role('singer', 'Singer', 'artist', ['vocal performance', 'stage presence']),
      role('songwriter', 'Songwriter', 'artist', ['lyric writing', 'composition']),
      role('composer', 'Composer', 'artist', ['composition', 'arrangement']),
      role('producer', 'Producer', 'staff', ['arrangement', 'session planning']),
      role('sound_engineer', 'Sound Engineer', 'staff', ['mixing', 'signal routing']),
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    roles: [
      role('dancer', 'Dancer', 'artist', ['choreography', 'stage presence']),
      role('choreographer', 'Choreographer', 'artist', ['choreography', 'ensemble direction']),
      role('actor', 'Actor', 'artist', ['scene study', 'improvisation']),
      role('theatre_performer', 'Theatre Performer', 'artist', ['stagecraft', 'voice projection']),
    ],
  },
  {
    id: 'fashion',
    label: 'Fashion',
    roles: [
      role('model', 'Model', 'artist', ['runway', 'editorial posing']),
      role('fashion_designer', 'Fashion Designer', 'staff', ['pattern making', 'collection design']),
      role('stylist', 'Stylist', 'staff', ['wardrobe', 'editorial styling']),
      role('creative_director', 'Creative Director', 'staff', ['art direction', 'campaign concept']),
    ],
  },
  {
    id: 'visual_media',
    label: 'Visual media',
    roles: [
      role('photographer', 'Photographer', 'staff', ['composition', 'lighting']),
      role('animator', 'Animator', 'staff', ['motion', 'storyboarding']),
      role('filmmaker', 'Filmmaker', 'staff', ['directing', 'editing']),
      role('editor', 'Editor', 'staff', ['continuity', 'post-production']),
    ],
  },
  {
    id: 'management',
    label: 'Management',
    roles: [
      role('talent_agent', 'Talent Agent', 'staff', ['negotiation', 'roster management']),
      role('artist_manager', 'Artist Manager', 'staff', ['career planning', 'logistics']),
      role('casting_director', 'Casting Director', 'staff', ['role breakdown', 'audition review']),
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    roles: [
      role('publicist', 'Publicist', 'staff', ['press outreach', 'messaging']),
      role('journalist', 'Journalist', 'staff', ['reporting', 'criticism']),
      role('radio_host', 'Radio Host', 'staff', ['presenting', 'interviewing']),
    ],
  },
  {
    id: 'production',
    label: 'Production',
    roles: [
      role('stage_manager', 'Stage Manager', 'staff', ['cue calling', 'stage logistics']),
      role('lighting_technician', 'Lighting Technician', 'staff', ['rigging', 'lighting cues']),
      role('event_coordinator', 'Event Coordinator', 'staff', ['scheduling', 'vendor logistics']),
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    roles: [
      role('licensing_specialist', 'Licensing Specialist', 'staff', ['rights clearance', 'contract review']),
      role('royalty_analyst', 'Royalty Analyst', 'staff', ['ledger reconciliation', 'split analysis']),
      role('membership_coordinator', 'Membership Coordinator', 'staff', ['member services', 'records']),
    ],
  },
];

export const ENTERTAINMENT_ROLES: EntertainmentRole[] = ENTERTAINMENT_CAREER_FAMILIES.flatMap(family => family.roles);

export function isArtistRole(roleId: string): boolean {
  return ENTERTAINMENT_ROLES.find(item => item.id === roleId)?.kind === 'artist';
}

export function rolesForFamily(familyId: string): EntertainmentRole[] {
  return ENTERTAINMENT_CAREER_FAMILIES.find(family => family.id === familyId)?.roles ?? [];
}