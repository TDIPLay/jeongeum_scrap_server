import mysql from "../../service/mysql";
import moment from "moment";
import {getRedis} from "../../service/redis";
import {promisify} from "util";
import {QUERY, R_PRESS, R_SEARCH_API, R_STOCK, R_TREND_API} from "../helpers/common";
import service from "../../service/common_service"
import {SearchApi, StockData} from "../interfaces";
import {hgetData, hmsetRedis} from "./worker";
import {sendBriefingMail} from "./mailer";

export async function initPress(): Promise<boolean> {
    const press = await mysql.getInstance().query(QUERY.Press);

    const redis = await getRedis();
    const hash: Record<string, number> = {};
    for (const api of press) {
        hash[api.press_id] = api.press_name;
    }
    await hmsetRedis(redis, R_PRESS, hash, 0);
    return true;
}

export async function initAPIResource(): Promise<boolean> {
    const result = await mysql.getInstance().query(QUERY.Search_API);
    service.apis = result.map(obj => ({
        ...obj,
        api_key: JSON.parse(obj.api_key),
    }));

    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        const redis = await getRedis();
        const hash: Record<string, number> = {};
        for (const api of service.apis) {
            hash[api.api_name] = 0;
        }
        console.log("Serach_Api 카운트 초기화")
        await hmsetRedis(redis, R_SEARCH_API, hash, 0);
        await hmsetRedis(redis, R_TREND_API, hash, 0);
    }
    return true;
}

export async function initStock(): Promise<boolean> {
    const stock: StockData[] = await mysql.getInstance().query(QUERY.Stock);

    const redis = await getRedis();
    const hash: Record<string, string> = {};
    for (const api of stock) {
        hash[api.name] = api.code;
    }
    await hmsetRedis(redis, R_STOCK, hash, 0);
    return true;
}

export async function searchApiIdx(redisKey:string): Promise<number> {
    const search_api: SearchApi[] = service.apis;

    if (service.apis.length > 0) {
        const redis = await getRedis();
        let selectIdx = 0;
        let minReqCnt = Infinity;
        for (let i = 0; i < search_api.length; i++) {
            const reqCnt = await hgetData(redis, redisKey,"json", search_api[i].api_name);
            if (reqCnt === null) {
                await hmsetRedis(redis, redisKey, {[`${search_api[i].api_name}`]: 0}, 0);
                selectIdx = i;
                break;
            } else {
                if (reqCnt < minReqCnt) {
                    selectIdx = i;
                    minReqCnt = reqCnt;
                }
            }
        }
        if (redisKey === R_SEARCH_API && minReqCnt >= 24000) {
            await sendBriefingMail('tdiplaydev@nsmg21.com','네이버 검색 api 사용량 경고',`최대/현재(1n) : 25000/${minReqCnt}`)
            console.log("limit cnt Over 24000");
        }
        if (redisKey === R_TREND_API && minReqCnt >= 950) {
            await sendBriefingMail('tdiplaydev@nsmg21.com','네이버 트렌드 api 사용량 경고',`최대/현재(1n) : 1000/${minReqCnt}`)
            console.log("limit cnt Over 950");
        }
        return selectIdx;
    }
    return -1;
}

export async function getApiClientKey(key:string, crbyCnt: number): Promise<{ client_id: string, client_secret: string }> {
    const redis = await getRedis();
    const api = service.apiIdx;

    if(key === R_SEARCH_API){
        if (api.search !== -1) {
            const {client_id, client_secret} = service.apis[api.search].api_key;
            redis.hincrbyfloat(key, service.apis[api.search].api_name,crbyCnt)
            return {client_id, client_secret};
        }
    }else{
        if (api.trend !== -1) {
            const {client_id, client_secret} = service.apis[api.trend ].api_key;
            redis.hincrbyfloat(key, service.apis[api.trend ].api_name, crbyCnt)
            return {client_id, client_secret};
        }
    }

    const {NAVER_CLIENT_ID, NAVER_CLIENT_SECRET} = process.env;
    return {client_id: NAVER_CLIENT_ID, client_secret: NAVER_CLIENT_SECRET};
}

export async function init_Transaction(): Promise<boolean> {
    const redis = await getRedis();
    const tm = moment().unix();
    const hscan = promisify(redis.hscan).bind(redis);

    const scanAll = async (pattern) => {
        let rediskey = '';
        let cursor = '0';
        do {
            const reply = await hscan('Transaction', cursor, "COUNT", "100")
            cursor = reply[0];
            for (const key in reply[1]) {
                if (reply[1].hasOwnProperty(key)) {
                    if (parseInt(key) % 2 == 0) {
                        rediskey = reply[1][key];
                    } else {
                        try {
                            const uData = JSON.parse(reply[1][key]);
                            if ((tm - uData.tm) > 3600) {
                                redis.hdel('Transaction', rediskey);
                                console.log(`deleted => ${rediskey}_time:${tm - uData.tm}`);
                            }
                        } catch (e) {
                            console.log(e)
                        }
                    }
                }
            }
        } while (cursor !== '0');
    }
    await scanAll('');

    return true;
}
