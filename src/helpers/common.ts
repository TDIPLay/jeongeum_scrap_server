import {ResponseType} from 'axios';

export const REDIS_EXPIRE = 86400		                    // 레디스 expire TTL
export const FIX = 10000		                            // 소수점 4자리
export const TOTAL_COUNT_STOCK = 2590		                            // 소수점 4자리


export const R_KEYWORD = "KEYWORD"		            //Redis KEYWORD key
export const R_BlOG_KEYWORD = "BLOG_KEYWORD"		            //Redis KEYWORD key
export const R_CAFE_KEYWORD = "CAFE_KEYWORD"		            //Redis KEYWORD key
export const R_REPLY_KEYWORD = "Keyword_Reply"		        //Redis Reply key
export const R_TOTEN = "Token"		                        //Redis KEYWORD key
export const R_SEARCH_API = "Search_Api"		                //Redis Serach_Api key
export const R_TREND_API = "Trend_Api"		                //Redis Trend_Api key
export const R_TREND_DATA = "Trend_Data"		            //Redis Trend_Data key
export const R_PRESS = "PressInfo"		                    //Redis PressInfo key
export const R_STOCK = "StockInfo"		                    //Redis StockInfo key
export const R_PRESS_NON = "NON_Press"		                    //Redis NON_Press key
export const RTOTEN_GOOGLE = "Token_Google"		            //Redis Token_Google key
export const MAX_LINK = 200		                    // MAX_LINK
export const NAVER_API_URL = "https://openapi.naver.com/v1/search/news.json"
export const NAVER_RANK_URL = "https://news.naver.com/main/ranking/popularDay.naver"

export const AXIOS_OPTIONS = {
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36",
    },
    encoding: null,
    method: "GET",
    timeout: 5000,
    maxRedirects: 3,
    onRedirect: (redirectRequest, redirectResponse) => {
        console.log(`Redirected to: ${redirectResponse.headers.location}`);
    },
    responseType: "arraybuffer" as ResponseType,
};

export const REQUEST_OPTIONS = {
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36",
    },
    encoding: null,
    timeout: 7000,
    followRedirect: true,
    maxRedirects: 3,
};

export enum ALARM {
    email = '1',
    kakao = '2',
}

export const QUERY = {
    Alarm: "SELECT \n" +
        "KA.user_keyword_no, \n" +
        "UK.keyword,\n" +
        "KA.alarm_start_time, \n" +
        "KA.alarm_end_time, \n" +
        "KA.alarm_type, \n" +
        "KA.alarm_mail, \n" +
        "KA.alarm_phone_number \n" +
        "FROM \n" +
        "keyword_alarm KA\n" +
        "LEFT JOIN\n" +
        "user_keyword UK\n" +
        "ON\n" +
        "KA.user_keyword_no = UK.keyword_no\n" +
        "WHERE \n" +
        "KA.alarm_type != 0",

    Stock: "SELECT " +
        "name, " +
        "code" +
        " FROM stock ",

    StockRaw: "SELECT " +
        "name, " +
        "code" +
        " FROM stock ",
    Search_API: "SELECT " +
        "api_name," +
        "api_limit, " +
        "api_key " +
        "FROM api_management " +
        "WHERE api_type = 'search'",

    Press: "SELECT" +
        " press_id" +
        ", press_name" +
        " FROM press WHERE " +
        "press_id != '' " +
        "AND " +
        "press_name != ''"
}
export const DEVICE_STATUS = {
    active: 'Y',
    pending: 'N',
    unknown: 'UNKNOWN'
}


