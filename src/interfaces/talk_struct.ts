export interface News {

    title: string;
    link: string;
    originallink?: string;
    description: string;
    pubDate?: string;
    thumbnail?: string;
    postdate?: string;
    content?: string;
    like?: {};
    reply?: string[];
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
    timestamp?: number;
    title: string;
    link: string;
    originalLink?: string;
    reply?: string[];
    description: string;
    pubDate?: string;
}
export interface AlarmData {
    user_keyword_no: number;
    keyword: string;
    alarm_start_time: string;
    alarm_end_time: string;
    alarm_type: string;
    alarm_mail: string;
    alarm_phone_number: string;
}

export interface SearchApi {
    api_name: string;
    api_limit: number;
    api_key: ApiKey;
}
interface ApiKey {
    client_id: string;
    client_secret: string;
}
export interface KeywordAlarm {
    start_time: number;
    end_time: number;
    alarm_type: string;
    keyword: string[];
}
export interface AlarmMailKeywords {
    [key: string]: string[];
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
