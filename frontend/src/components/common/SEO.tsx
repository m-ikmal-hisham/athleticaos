import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
}

export const SEO = ({
    title = 'AthleticaOS',
    description = 'The complete operating system for sports organisations.',
    image = '/og-image.png',
    url = window.location.href,
    type = 'website'
}: SEOProps) => {
    // Ensure absolute URL for image
    const fullImage = image.startsWith('http') ? image : `${window.location.origin}${image}`;
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    const siteTitle = title === 'AthleticaOS' ? title : `${title} | AthleticaOS`;

    return (
        <Helmet>
            {/* Standard metadata */}
            <title>{siteTitle}</title>
            <meta name="description" content={description} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={fullUrl} />
            <meta property="og:title" content={siteTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={fullImage} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={fullUrl} />
            <meta property="twitter:title" content={siteTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={fullImage} />
        </Helmet>
    );
};
