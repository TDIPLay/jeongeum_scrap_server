import { ResponseType } from 'axios';
export const REDIS_EXPIRE = 86400		        // 레디스 expire TTL
export const FIX = 10000		                    // 소수점 4자리
export const RKEYWORD = "NewAllKeyword"		                    //Redis KEYWORD key
export const MAX_LINK = 1000		                    // MAX_LINK
export const NAVER_API_URL = "https://openapi.naver.com/v1/search/news.json"
export const NAVER_RANK_URL = "https://news.naver.com/main/ranking/popularDay.naver"


export const DEVICE_STATUS = {
    active: 'Y',
    pending: 'N',
    unknown: 'UNKNOWN'
}

export const AXIOS_OPTIONS = {
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36",
    },
    encoding: null,
    method: "GET",
    timeout: 5000,
    responseType: "arraybuffer" as ResponseType,
};
