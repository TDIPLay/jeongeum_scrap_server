export interface News {
    title: string;
    link: string;
    thumbnail?: string;
    originalLink?: string;
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
export interface PageInfo {
    [company: string]: News[];
}
