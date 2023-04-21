import mysql from "./mysql"
import cron from 'node-cron';
import {getDateString, logger} from "../src/helpers/utils";
import {xServerError} from "../src/helpers/errors";
import {initAPIResource, initPress, searchApiIdx} from "../src/controllers/engine"
import {hgetData, hmsetRedis, initRedisHmSet} from "../src/controllers/worker";
import {processKeywordAlarms} from "../src/controllers/user";
import {AlarmData, KeywordAlarm, SearchApi} from "../src/interfaces";
import {QUERY, RKEYWORD, RSEARCHAPI, RTOTEN} from "../src/helpers/common";
import {getRedis} from "./redis";

export default class Common_service {


    private static INSTANCE: Common_service;
    static server_info: any = {};
    static alarm_info: { [p: string]: KeywordAlarm } = {};
    static search_api:SearchApi[]= [];
    static search_api_idx = -1;
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
        cron.schedule("*/10 * * * *", async () => {
            logger.info(getDateString(0, 'default'));
            await this.module_start();
        });
    }

    async module_start() {
        logger.info("init_start")
        try {
            const result: AlarmData[] = await mysql.getInstance().query(QUERY.Alarm);
            Common_service.alarm_info = processKeywordAlarms(result)


            await this.engine_start();
        } catch (e) {
            logger.error(e)
            logger.info("init_err")
        }
    }

    async engine_start() {
        if (!await initPress()) {
            console.log("initAPIResource error");
        }

        if (!await initAPIResource()) {
            console.log("initAPIResource error");
        }

        if ((Common_service.search_api_idx = await searchApiIdx()) === -1) {
            console.log("searchApiIdx none");
        }

        const apiIdx = await searchApiIdx();
        if (apiIdx > -1) {
            if(Common_service.search_api_idx !== apiIdx){
                console.log(`${Common_service.search_api[Common_service.search_api_idx] } Changed => ${Common_service.search_api[apiIdx] }`);
                Common_service.search_api_idx = apiIdx;
            }

        }
    }

//{"client_id": "QrfAfnf3E2JLwgfT2HwP", "client_secret": "xTnEl_Vq9f"}
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
