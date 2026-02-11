export default {
  siteUrl: process.env.SITE_URL || 'https://wiki.deinedomain.de',
  siteName: 'Athlete Wiki',
  analyticsToken: process.env.CF_ANALYTICS_TOKEN || null,
  injectNavbar: true,
  injectOgTags: true,
  buildDrafts: process.env.BUILD_DRAFTS === 'true',
  legal: {
    name: process.env.LEGAL_NAME || '[Name eintragen]',
    address: process.env.LEGAL_ADDRESS || '[Adresse eintragen]',
    email: process.env.LEGAL_EMAIL || '[E-Mail eintragen]',
  },
};
