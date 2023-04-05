import { ResponseType } from 'axios';
export const REDIS_EXPIRE = 86400		        // 레디스 expire TTL
export const FIX = 10000		                    // 소수점 4자리

export const QUERY = {
    APP: "SELECT\n" +
        "  a.*\n" +
        "FROM\n" +
        "  app a\n" +
        "WHERE a.is_active = 1  "

}

export const DEVICE_STATUS = {
    active: 'Y',
    pending: 'N',
    unknown: 'UNKNOWN'
}

export const emailRegex = /\S+@\S+\.\S+/;
export const User_Agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36";
export const AXIOS_OPTIONS = {
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36",
    },
    encoding: null,
    method: "GET",
    timeout: 5000,
    responseType: "arraybuffer" as ResponseType,
};
