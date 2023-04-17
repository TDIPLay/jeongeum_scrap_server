export interface News {

    title: string;
    link: string;
    originallink?: string;
    description: string;
    pubDate?: string;
    thumbnail?: string;
    content?: string;
    company?: string;
    author?: string;
    email?: string;
    name?: string;
    timestamp?: number;
}
export interface KakaoAccessTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    vendor?:string;
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
export interface NewsItem {

    title: string;
    link: string;
    originalLink?: string;
    description: string;
    pubDate?: string;
}

export interface ICommonOK {
    result: string,
    code: 0,
    message: string,
    data: any
}

export interface IConfigFail {
    result: string,
    code: number,
    message: string,
    data: {}
}

export interface Scraper {
    [company: string]: News[];
}
