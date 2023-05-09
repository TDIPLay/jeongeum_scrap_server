/* eslint-disable no-inline-comments */
import type {RedisClientType} from 'redis'
import {createClient} from 'redis'
import {logger} from '../src/helpers/utils';
import Common_service from "./common_service";
import service from "./common_service"

let redisClient: RedisClientType
let isReady: boolean = false;
let errCount : number = 0;


function createRedisClient() {

    const cacheOptions = {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        db: process.env.REDIS_IDX,
        password: process.env.REDIS_PASS
    }
    Object.assign(cacheOptions, {
        socket: {
            // keepAlive: 300, // 5 minutes DEFAULT
            tls: false,
        },
    })

    redisClient = createClient({
        ...cacheOptions,
    });

    redisClient.on("error", (err) => {
        logger.error(`Redis Error: ${err}`);
        isReady = false;
        errCount = 0;
    });

    redisClient.on("connect", () => {
        logger.info("Redis connected");
    });

    redisClient.on("reconnecting", () => {
        logger.info("Redis reconnecting");
        errCount++;
    });

    redisClient.on("ready", () => {
        logger.info("Redis ready!");

        if (errCount === 1) {
            service.getInstance().module_start();
            errCount = 0;
        }
        isReady = true;
    });

}

/*async function getRedis(): Promise<RedisClientType> {

    if (!redisClient || !redisClient.connected && !isReady) {
        createRedisClient();
        await new Promise((resolve) => redisClient.once("ready", resolve));
        service.system_flag = true;
        isReady = true;
    }
    return redisClient;
}*/


async function getRedis(): Promise<RedisClientType> {
    if (redisClient && (redisClient.connected || isReady)) {
        return redisClient;
    }

    await new Promise((resolve) => {
        if (isReady) {
            Promise.resolve().then(resolve);
        } else {
            createRedisClient();
            redisClient.once("ready", () => Promise.resolve().then(resolve));
        }
    });

    service.system_flag = true;
    isReady = true;

    return redisClient;
}

export {
    getRedis,
}


// import { getCache } from '@services/redis_cache'
//
// const cache = await getCache()
// cache.setEx(accountId, 60, JSON.stringify(account))
