import type { MediaChannel, VerificationTier } from '../components/media/templateModel';

export interface CreativeStudioPermissions {
  isAdmin: boolean;
  hasPressContract: boolean;
  hasArtistContract: boolean;
  hasInstitutionalCommsRole: boolean;
  allowedChannels: MediaChannel[];
  allowedVerificationTiers: VerificationTier[];
  roleSummary: string;
}

export function evaluateCreativeStudioPermissions(player: any, isLoggedIn: boolean): CreativeStudioPermissions {
  if (!isLoggedIn) return { isAdmin: false, hasPressContract: false, hasArtistContract: false, hasInstitutionalCommsRole: false,
    allowedChannels: [], allowedVerificationTiers: [], roleSummary: 'Sign in to publish creative work.' };
  const isAdmin = Boolean(isLoggedIn && player?.isAdmin);
  const contracts = player?.employmentContracts || {};
  const hasPressContract = Boolean(contracts.press);
  const hasArtistContract = Boolean(contracts.artist);
  const hasInstitutionalCommsRole = Boolean(contracts.diplomat || contracts.dga || contracts.medical || contracts.archivist);

  if (isAdmin) {
    return {
      isAdmin: true,
      hasPressContract,
      hasArtistContract,
      hasInstitutionalCommsRole,
      allowedChannels: ['social', 'newspaper', 'magazine', 'document'],
      allowedVerificationTiers: ['canon_official', 'verified_reporting', 'opinion', 'promo', 'personal_perspective'],
      roleSummary: 'World Administrator · Full Canon, Template & Checkpoint Authority',
    };
  }

  const allowedChannels: MediaChannel[] = ['social', 'document'];
  const allowedVerificationTiers: VerificationTier[] = ['personal_perspective'];

  if (hasPressContract) {
    allowedChannels.push('newspaper', 'magazine');
    allowedVerificationTiers.push('verified_reporting', 'opinion');
  }
  if (hasArtistContract) {
    if (!allowedChannels.includes('magazine')) allowedChannels.push('magazine');
    allowedVerificationTiers.push('promo');
  }
  if (hasInstitutionalCommsRole && !allowedVerificationTiers.includes('verified_reporting')) {
    allowedVerificationTiers.push('verified_reporting');
  }

  const roleLabels: string[] = [];
  if (hasPressContract) roleLabels.push('Meridian & Social Register Press');
  if (hasArtistContract) roleLabels.push('Velvet Studio Visual Creator');
  if (hasInstitutionalCommsRole) roleLabels.push('Institutional Spokesperson');
  if (!roleLabels.length) roleLabels.push('Independent Citizen Creator (Sign a Press or Velvet Studio contract in WORKNET for periodical publishing)');

  return {
    isAdmin: false,
    hasPressContract,
    hasArtistContract,
    hasInstitutionalCommsRole,
    allowedChannels,
    allowedVerificationTiers,
    roleSummary: roleLabels.join(' · '),
  };
}

export function validateStudioPublishPermission(
  perms: CreativeStudioPermissions,
  channel: MediaChannel,
  tier: VerificationTier,
): { ok: boolean; reason?: string } {
  if (!perms.allowedChannels.includes(channel)) {
    return {
      ok: false,
      reason: `Publishing to the '${channel}' channel requires an active Press/Publishing or Velvet Studio contract in WORKNET (or World Administrator access).`,
    };
  }
  if (!perms.allowedVerificationTiers.includes(tier)) {
    return {
      ok: false,
      reason: `Verification tier '${tier}' exceeds your current professional credentials.`,
    };
  }
  return { ok: true };
}
