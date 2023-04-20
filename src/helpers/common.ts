import {ResponseType} from 'axios';

export const REDIS_EXPIRE = 86400		        // 레디스 expire TTL
export const FIX = 10000		                    // 소수점 4자리
export const RKEYWORD = "Keyword_Jungeum"		                    //Redis KEYWORD key
export const RTOTEN = "Token"		                    //Redis KEYWORD key
export const RSEARCHAPI = "Serach_Api"		                    //Redis KEYWORD key
export const RTOTEN_GOOGLE = "Token_Google"		                    //Redis KEYWORD key
export const MAX_LINK = 200		                    // MAX_LINK
export const NAVER_API_URL = "https://openapi.naver.com/v1/search/news.json"
export const NAVER_RANK_URL = "https://news.naver.com/main/ranking/popularDay.naver"


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

    Search_API: "SELECT " +
        "api_name," +
        "api_limit, " +
        "api_key " +
        "FROM api_management " +
        "WHERE api_type = 'search'",
}
export const DEVICE_STATUS = {
    active: 'Y',
    pending: 'N',
    unknown: 'UNKNOWN'
}


