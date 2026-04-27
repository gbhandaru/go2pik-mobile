export const SUPPORT_EMAIL = 'support@go2pik.com';

export function buildSupportMailtoHref(subject = 'Go2Pik support', body = 'Hi Go2Pik team, I need help with my order or account.') {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const query = params.toString();
  return query ? `mailto:${SUPPORT_EMAIL}?${query}` : `mailto:${SUPPORT_EMAIL}`;
}
