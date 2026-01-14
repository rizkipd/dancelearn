import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  lang?: string;
}

export function SEO({
  title,
  description,
  canonical = 'https://www.dancetwin.com',
  ogImage = 'https://www.dancetwin.com/DanceTwin-Logo.png',
  ogType = 'website',
  noindex = false,
  lang = 'en'
}: SEOProps) {
  const fullTitle = title.includes('DanceTwin') ? title : `${title} | DanceTwin`;
  const languages = ['en', 'ja', 'id', 'ko', 'zh'];

  // Ensure canonical URL doesn't have trailing slash (except for root)
  const cleanCanonical = canonical.endsWith('/') && canonical !== 'https://www.dancetwin.com/'
    ? canonical.slice(0, -1)
    : canonical;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={cleanCanonical} />

      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={cleanCanonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={cleanCanonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Language alternates */}
      {languages.map(langCode => (
        <link
          key={langCode}
          rel="alternate"
          hrefLang={langCode}
          href={`${cleanCanonical}${cleanCanonical.includes('?') ? '&' : '?'}lang=${langCode}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={cleanCanonical} />
    </Helmet>
  );
}
