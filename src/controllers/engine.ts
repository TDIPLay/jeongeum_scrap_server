import {logger} from "../helpers/utils";
import mysql from "../../service/mysql";
import moment from "moment";
import {getRedis} from "../../service/redis";
import {promisify} from "util";
import {QUERY, RSEARCHAPI} from "../helpers/common";
import service from "../../service/common_service"
import {SearchApi} from "../interfaces";
import {hgetData, hmsetRedis} from "./worker";

export async function initAPIResource(): Promise<boolean> {
    const result = JSON.parse(JSON.stringify(await mysql.getInstance().query(QUERY.Search_API)));
    service.search_api = result.map(obj => {
        obj.api_key = JSON.parse(obj.api_key);
        return obj;
    });
    const per_hours: number = new Date().getHours();
    const per_min: number = new Date().getMinutes();
    const search_api:SearchApi[] = service.search_api;

    if (per_hours === 0 && per_min === 0) {
        const redis = await getRedis();
        for (const key in search_api) {
            await hmsetRedis(redis, RSEARCHAPI, {[`${search_api[key].api_name}`]: 0}, 0);
        }
    }
    return true;
}

export async function searchApiIdx(): Promise<number> {
    const search_api: SearchApi[] = service.search_api;

    if (service.search_api.length > 0) {
        const redis = await getRedis();
        let selectIdx = 0;
        let minReqCnt = Infinity;
        for (let i = 0; i < search_api.length; i++) {
            const reqCnt = await hgetData(redis, RSEARCHAPI, search_api[i].api_name);
            if (reqCnt === null) {
                await hmsetRedis(await getRedis(), RSEARCHAPI, {[`${search_api[i].api_name}`]: 0}, 0);
                selectIdx = i;
                break;
            } else {
                if (reqCnt < minReqCnt) {
                    selectIdx = i;
                    minReqCnt = reqCnt;
                }
            }
        }
        if (minReqCnt >= 24000) {
            console.log("limit cnt Over 24000");
        }
        return selectIdx;
    }
    return -1;
}
export async function getApiClientKey(): Promise<{ client_id: string, client_secret: string }> {
    if (service.search_api_idx !== -1) {
        const {client_id, client_secret} = service.search_api[service.search_api_idx].api_key;
        const redis = await getRedis();
        redis.hincrbyfloat(RSEARCHAPI, service.search_api[service.search_api_idx].api_name, 1)
        return {client_id, client_secret};
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
                        }catch (e) {
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
