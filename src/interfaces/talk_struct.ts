export interface News {

    title: string;
    link: string;
    originalLink?: string;
    thumbnail?: string;
    content?: string;
    description: string;
    company?: string;
    author?: string;
    email?: string;
    name?: string;
    pubDate?: string;
    timestamp?: number;
}

export interface SearchNews {
    title: string;
    link: string;
    description: string;
    pubDate: string;
}

interface MetaData {
    title: string;
    description: string;
    classification: string;
    ogSiteName: string;
    ogImage: string;
    ogType: string;
    ogUrl: string;
    ogTitle: string;
    ogDescription: string;
    ogArticleAuthor: string;
    twitterCard: string;
    twitterTitle: string;
    twitterDescription: string;
}


export interface Scraper {
    [company: string]: News[];
}
