type PageMetadataProps = {
  title: string;
  description: string;
  noindex?: boolean;
};

const SITE_NAME = 'Yet Another Umalator';

export function PageMetadata({ title, description, noindex = false }: PageMetadataProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
    </>
  );
}
