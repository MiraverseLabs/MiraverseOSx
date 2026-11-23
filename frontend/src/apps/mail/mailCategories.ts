import type { AureMailAccount, EmailItem } from '../../data/commsData';

export type InboxCategory = 'all' | 'primary' | 'institution' | 'delivery';
export type AccountScope = 'ALL' | 'personal' | 'academic' | 'work' | string;

export function classifyInboxCategory(mail: EmailItem): Exclude<InboxCategory, 'all'> {
  if (
    mail.category === 'delivery' ||
    mail.linkedApp === 'post' ||
    Boolean(mail.trackingNumber) ||
    /meridion post|cargotrack|shipping\.aure|meridionpost\.aure|package delivered|postage receipt|shipment dispatched|tracking #/i.test(
      `${mail.sender} ${mail.senderAddress || ''} ${mail.subject} ${mail.faction || ''}`,
    )
  ) {
    return 'delivery';
  }
  if (
    mail.category === 'institution' ||
    Boolean(mail.institutionalSeal) ||
    mail.accountType === 'academic' ||
    mail.accountType === 'institutional' ||
    mail.accountType === 'work' ||
    /\.edu$|\.gov$|worknet\.aure|faithmed\.aure/i.test(mail.senderAddress || '') ||
    /DGA|Faith Medical|Cyberium Academy|Dawn University|Regent Hall|Civic|Bureau|Registrar|WorkNet|Housing/i.test(
      `${mail.sender} ${mail.faction || ''}`,
    )
  ) {
    return 'institution';
  }
  return 'primary';
}

export function matchesAccountScope(
  mail: EmailItem,
  scope: AccountScope,
  accounts: AureMailAccount[],
): boolean {
  if (!scope || scope === 'ALL') return true;
  const recipient = (mail.recipientAddress || '').toLowerCase();
  const sender = (mail.senderAddress || '').toLowerCase();
  if (scope === 'personal') {
    const personalAddresses = accounts.filter(a => a.accountType === 'personal').map(a => a.address.toLowerCase());
    if (mail.accountType === 'personal') return true;
    return personalAddresses.includes(recipient) || personalAddresses.includes(sender);
  }
  if (scope === 'academic') {
    return (
      mail.accountType === 'academic' ||
      /\.edu$/i.test(recipient) ||
      /\.edu$/i.test(sender) ||
      /Cyberium Academy|Dawn University|Regent Hall/i.test(`${mail.sender} ${mail.faction || ''}`)
    );
  }
  if (scope === 'work') {
    return (
      mail.accountType === 'work' ||
      mail.accountType === 'institutional' ||
      /\.gov$|worknet\.aure|faithmed\.aure/i.test(recipient) ||
      /\.gov$|worknet\.aure|faithmed\.aure/i.test(sender) ||
      /DGA|Faith Medical|WorkNet|Treasury|Archives/i.test(`${mail.sender} ${mail.faction || ''}`)
    );
  }
  const lower = scope.toLowerCase();
  return recipient === lower || sender === lower;
}
