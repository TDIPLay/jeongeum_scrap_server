import {getDateString, logger} from "../helpers/utils";
import {promisify} from "util";
import {getRedis} from "../../service/redis";


export const hgetData = async (client, key: string, t_id: string) => {

    const redis = client || await getRedis();
    const hget_Async: any = promisify(redis.hget).bind(redis);
    const data = await hget_Async(key, t_id);

    if (data != null) return JSON.parse(data);
    else return null;
}

export const hgetAllData = async (client, key: string) => {

    const redis = client || await getRedis();
    const hgetall_Async: any = promisify(redis.hgetall).bind(redis);
    const data = await hgetall_Async(key);

    if (data != null) return data;
    else return null;
}

export const getKey = async (client, key: string) => {

    const redis = client || await getRedis();
    const hkeys_Async: any = promisify(redis.hkeys).bind(redis);
    const data = await hkeys_Async(key);

    if (data != null) return data;
    else return null;
}

export const hmsetRedis = async (client, key: string, val: any, expire: number) => {

    const redis = client || await getRedis();
    redis.hmset(key, val, (err) => {
        if (!err && expire) {
            redis.expire(key, expire)
        } else if (err) logger.error({err})
    });
}

export const initRedisHmSet = (key: string, redis, result: string, expire: number) => {
    redis.hmset(key, {data: result, "update_time": getDateString(0,"default")}, (err) => {

        if (!err) redis.expire(key, expire)
        else logger.error({err})
    });
}
