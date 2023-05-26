
export interface News {

    title: string;
    link: string;
    originallink?: string;
    description: string;
    pubDate?: string;
    thumbnail?: string;
    postdate?: string;
    content?: string;
    //reply?: { contents: string[]; sympathy: any[]; non_sympathy: any[] };
    reply?: any;
    like?: {};
    company?: string;
    author?: string;
    email?: string[];
    name?: string[];
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

export interface NewsItem {
    timestamp?: number;
    title: string;
    link: string;
    originalLink?: string;
    //reply?: { contents: string[]; sympathy: any[]; non_sympathy: any[] };
    reply?: any;
    description: string;
    pubDate?: string;
}

export interface BlogItem {
    timestamp?: number;
    title: string;
    link: string;
    //reply?: { contents: string[]; sympathy: any[]; non_sympathy: any[] };
    reply?: any;
    description: string;
    postdate?: string;
    pubDate?: string;
}

export interface CafeItem {
    timestamp?: number;
    title: string;
    link: string;
    reply?: any;
    description: string;
    cafename: string;
    cafeurl: string;
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
export interface StockData {
    name: number;
    code: string;
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

export interface Stock {
    date: string;
    title: string;
    content?: string;
    link: string;
    author: string;
    reply_count?: number;
    reply?: any;
    views: number;
    sympathy: number;
    non_sympathy: number;
}
export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    vendor?:string;
}

export interface TalkUser {
    senderkey: string;
    tpl_code: string;
    sender: string;
    receiver_1: string;
    subject_1: string;
    emtitle_1: string;
    message_1: string;
    button_1: {
        button: {
            name: string;
            linkType: string;
            linkTypeName: string;
            linkMo: string;
            linkPc: string;
        }[];
    };
}

export interface UserInfo {
    id: string;
    nickname: string;
    profileImage: string;
    email: string;
    mobile: string;
}

export interface TokenInfo {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}

export interface UserInfoResponse {
    id: number;
    properties: {
        nickname: string;
        profile_image?: string;
        thumbnail_image?: string;
    };
    kakao_account: {
        profile_nickname_needs_agreement: boolean;
        profile_needs_agreement: boolean;
        profile: {
            nickname: string;
            thumbnail_image_url?: string;
            profile_image_url?: string;
            is_default_image?: boolean;
        };
        email_needs_agreement: boolean;
        has_email: boolean;
        email: string;
        is_email_valid?: boolean;
        is_email_verified: boolean;
        has_age_range?: boolean;
        age_range_needs_agreement?: boolean;
        age_range?: string;
        has_birthday?: boolean;
        birthday_needs_agreement?: boolean;
        birthday?: string;
        birthday_type?: string;
        has_gender?: boolean;
        gender_needs_agreement?: boolean;
        gender?: string;
    };
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
