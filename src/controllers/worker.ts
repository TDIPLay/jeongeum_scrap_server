import {getDateString, logger} from "../helpers/utils";
import {Query} from "mysql";
import mysql from "../../service/mysql";


export const initRedisHmSet = (key: string, redis, result: string, expire: number) => {
    redis.hmset(key, {data: result, "update_time": getDateString("default")}, (err) => {

        if (!err) redis.expire(key, expire)
        else logger.error({err})
    });
}

export const query = async (query: string, val: []): Promise<Query> => {
    return await mysql.getInstance().query(query, val);
}


