/* eslint-disable no-inline-comments */
import type {RedisClientType} from 'redis'
import {createClient} from 'redis'
import {logger} from '../src/helpers/utils';
import Common_service from "./common_service";
import service from "./common_service"

let redisClient: RedisClientType
let isReady: boolean
let err_Cnt: number = 0;

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

async function getRedis(): Promise<RedisClientType> {
    if (!isReady) {
        redisClient = createClient({
            ...cacheOptions,
        })
        redisClient.on('error', err => {
                logger.error(`Redis Error: ${err}`);
                service.system_flag = false;
                isReady = false;
                err_Cnt = 0;
            }
        )
        redisClient.on('connect', () => {
            logger.info('Redis connected')
        })
        redisClient.on('reconnecting', () => {
            logger.info('Redis reconnecting')
            service.system_flag = false;
            err_Cnt++;
        })
        redisClient.on('ready', () => {
            logger.info('Redis ready!')
            if (err_Cnt == 1) service.getInstance().module_start();
            service.system_flag = true;
            isReady = true;
        })
        // await redisClient.connect()
    }
    return redisClient
}

getRedis().then(connection => {
    redisClient = connection
}).catch(err => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    logger.error({err}, 'Failed to connect to Redis')
})

export {
    getRedis,
}


// import { getCache } from '@services/redis_cache'
//
// const cache = await getCache()
// cache.setEx(accountId, 60, JSON.stringify(account))
