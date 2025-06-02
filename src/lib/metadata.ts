interface PageMetadata {
    title: string;
    description: string | null;
    siteName: string | null;
    image: string | null;
}

function decodeHtmlEntities(text: string): string {
    const entities: { [key: string]: string } = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#x27;': "'",
        '&#x2F;': '/',
        '&#39;': "'",
        '&apos;': "'",
        '&nbsp;': ' ',
        '&ndash;': '–',
        '&mdash;': '—',
        '&hellip;': '…'
    };
    
    return text.replace(/&[#\w]+;/g, (entity) => {
        return entities[entity] || entity;
    });
}

export async function getPageMetadata(url: string): Promise<PageMetadata> {
    try {
        const response = await fetch(url);
        const html = await response.text();
        
        // Helper function to extract content from meta tags
        const getMetaContent = (regex: RegExp): string | null => {
            const match = html.match(regex);
            return match ? decodeHtmlEntities(match[1]) : null;
        };

        // Get OpenGraph description
        const description = getMetaContent(/<meta[^>]+(?:property="og:description"|name="description")[^>]+content="([^">]+)"/i) ||
            getMetaContent(/<meta[^>]+content="([^">]+)"[^>]+(?:property="og:description"|name="description")/i);

        // Get OpenGraph image
        const image = getMetaContent(/<meta[^>]+(?:property="og:image")[^>]+content="([^">]+)"/i) ||
            getMetaContent(/<meta[^>]+content="([^">]+)"[^>]+(?:property="og:image")/i);

        // Get site name
        const siteName = getMetaContent(/<meta[^>]+(?:property="og:site_name")[^>]+content="([^">]+)"/i) ||
            new URL(url).hostname.replace(/^www\./, '');

        // Get title
        const title = getMetaContent(/<meta[^>]+(?:property="og:title")[^>]+content="([^">]+)"/i) ||
            getMetaContent(/<title[^>]*>([^<]+)<\/title>/i) ||
            '';

        return {
            title,
            description,
            siteName,
            image
        };
    } catch (error) {
        console.error('Error fetching metadata:', error);
        return {
            title: new URL(url).hostname,
            description: null,
            siteName: new URL(url).hostname.replace(/^www\./, ''),
            image: null
        };
    }
} 