import mysql from "./mysql"
import {RedisClientType} from 'redis'
import cron from 'node-cron';
import {getDateString, logger} from "../src/helpers/utils";
import {xServerError} from "../src/helpers/errors";
import {news_status_change, calculate_weight, init_Transaction} from "../src/controllers/engine"
import {initRedisHmSet} from "../src/controllers/worker";

export default class Common_service {

    private static INSTANCE: Common_service;
    //  static ads: { [key: string]: IAds };
    static server_info: any = {};
    static kakao_a_key = "";
    static oldLinks: string[] = [];
    static sys_update_time = 0;
    static err_cnt = 0;
    static debug_flag_log = false;
    static system_flag = false;


    public static getInstance(): Common_service {
        if (!this.INSTANCE) {
            this.INSTANCE = new Common_service();
        }
        return Common_service.INSTANCE;
    }

    constructor() {
        //sql connection & make dataset
        //redis connection
        cron.schedule("*/10 * * * *", async () => {
            logger.info(getDateString("default"));
            await this.module_start();
        });
    }

    async module_start() {
        logger.info("init_start")
        // const redis = await getRedis();
        // await this.initDataSet("ADS", QUERY.ADS, ["ads_no"], redis, REDIS_EXPIRE).then(() => logger.info(`init ADS`));
        // await this.initDataSet("HOUSE", QUERY.HOUSE, ["ads_no"], redis, REDIS_EXPIRE).then(() => logger.info(`init HOUSE`));

    }

    async engine_start() {

        if (!await news_status_change()) {
            console.log("ads status change error");
        }

        if (!await calculate_weight()) {
            console.log("calculate_weight error");
        }

        await init_Transaction();
    }

    async update_data() {

    }

    private async initDataSet(key: string, query: string, sort_key: any, redis, expire: number) {
        try {
            await mysql.getInstance().query(query).then(async (raws) => {

                let result;

                if (redis !== null) {
                    initRedisHmSet(key, redis, JSON.stringify(result), expire);
                }

            }).catch((err) => setImmediate(() => {
                logger.error({err})
                throw err;
            }))
        } catch (e) {
            xServerError(e);
        }
    }


    sql_release() {
        mysql.getInstance().release().then(err => console.log(err))
    }
}
