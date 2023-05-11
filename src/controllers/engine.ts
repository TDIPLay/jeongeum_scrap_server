import mysql from "../../service/mysql";
import moment from "moment";
import {getRedis} from "../../service/redis";
import {promisify} from "util";
import {QUERY, RPRESS, RSEARCHAPI, RSTOCK, RTRENDAPI} from "../helpers/common";
import service from "../../service/common_service"
import {SearchApi, StockData} from "../interfaces";
import {hgetData, hmsetRedis} from "./worker";

export async function initPress(): Promise<boolean> {
    const press = await mysql.getInstance().query(QUERY.Press);

    const redis = await getRedis();
    const hash: Record<string, number> = {};
    for (const api of press) {
        hash[api.press_id] = api.press_name;
    }
    await hmsetRedis(redis, RPRESS, hash, 0);
    return true;
}

export async function initAPIResource(): Promise<boolean> {
    const result = await mysql.getInstance().query(QUERY.Search_API);
    service.search_api = result.map(obj => ({
        ...obj,
        api_key: JSON.parse(obj.api_key),
    }));

    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        const redis = await getRedis();
        const hash: Record<string, number> = {};
        for (const api of service.search_api) {
            hash[api.api_name] = 0;
        }
        console.log("Serach_Api 카운트 초기화")
        await hmsetRedis(redis, RSEARCHAPI, hash, 0);
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
    await hmsetRedis(redis, RSTOCK, hash, 0);
    return true;
}


export async function searchApiIdx(redisKey:string): Promise<number> {
    const search_api: SearchApi[] = service.search_api;

    if (service.search_api.length > 0) {
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
        if (redisKey === RSEARCHAPI && minReqCnt >= 24000) {
            console.log("limit cnt Over 24000");
        }
        if (redisKey === RTRENDAPI && minReqCnt >= 950) {
            console.log("limit cnt Over 950");
        }
        return selectIdx;
    }
    return -1;
}

export async function getApiClientKey(key:string, crbyCnt: number): Promise<{ client_id: string, client_secret: string }> {
    const redis = await getRedis();
    const api = service.search_api_idx;

    if(key === RSEARCHAPI){
        if (api.search !== -1) {
            const {client_id, client_secret} = service.search_api[api.search].api_key;
            redis.hincrbyfloat(key, service.search_api[api.search].api_name,crbyCnt)
            return {client_id, client_secret};
        }
    }else{
        if (api.trend !== -1) {
            const {client_id, client_secret} = service.search_api[api.trend ].api_key;
            redis.hincrbyfloat(key, service.search_api[api.trend ].api_name, crbyCnt)
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


    /* await redis.hkeys("Transaction", async (err, reply) => {
         if (reply != '') {
             const hget_Async: any = promisify(redis.hget).bind(redis);
             for (const key in reply) {
                 const userData = await hget_Async("Transaction", reply[key]);
                 const uData = JSON.parse(userData);

                 if ((tm - uData.tm) > 3600) {
                     redis.hdel("Transaction", reply[key])
                     console.log(`deleted ${reply[key]}`)
                 }
             }
         }
     })*/
    return true;
}
