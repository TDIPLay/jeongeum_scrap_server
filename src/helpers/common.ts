import { ResponseType } from 'axios';
export const REDIS_EXPIRE = 86400		        // 레디스 expire TTL
export const FIX = 10000		                    // 소수점 4자리
export const RKEYWORD = "Keyword_Jungeum"		                    //Redis KEYWORD key
export const RTOTEN = "Token"		                    //Redis KEYWORD key
export const RTOTEN_NAVER = "Token_Naver"		                    //Redis KEYWORD key
export const RTOTEN_GOOGLE = "Token_Google"		                    //Redis KEYWORD key
export const MAX_LINK = 200		                    // MAX_LINK
export const NAVER_API_URL = "https://openapi.naver.com/v1/search/news.json"
export const NAVER_RANK_URL = "https://news.naver.com/main/ranking/popularDay.naver"


export const DEVICE_STATUS = {
    active: 'Y',
    pending: 'N',
    unknown: 'UNKNOWN'
}


