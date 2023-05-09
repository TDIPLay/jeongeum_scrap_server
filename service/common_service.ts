import mysql from "./mysql"
import cron from 'node-cron';
import {getDateString, logger} from "../src/helpers/utils";
import {xServerError} from "../src/helpers/errors";
import {initAPIResource, initPress, initStock, searchApiIdx} from "../src/controllers/engine"
import {initRedisHmSet} from "../src/controllers/worker";
import {processKeywordAlarms} from "../src/controllers/user";
import {AlarmData, KeywordAlarm, SearchApi, StockData} from "../src/interfaces";
import {QUERY, RSEARCHAPI, RTRENDAPI} from "../src/helpers/common";

export default class Common_service {


    private static INSTANCE: Common_service;
    static server_info: any = {};
    static alarm_info: { [p: string]: KeywordAlarm } = {};
    static search_api:SearchApi[]= [];
    static search_api_idx = {search: -1, trend: -1};
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

        cron.schedule("*/1 * * * *", async () => {
            const trendIdx = await searchApiIdx(RTRENDAPI);
            if (trendIdx > -1) {
                if(Common_service.search_api_idx.trend !== trendIdx){
                    console.log(`${Common_service.search_api[Common_service?.search_api_idx.trend]?.api_name ?? ''  } Changed trendIdx => ${Common_service.search_api[trendIdx].api_name }`);
                    Common_service.search_api_idx.trend = trendIdx;
                }
            }
        });
    }

    async module_start() {
        logger.info("init_start")
        try {
            const resultAlarm: AlarmData[] = await mysql.getInstance().query(QUERY.Alarm);
            Common_service.alarm_info = processKeywordAlarms(resultAlarm)

            await this.engine_start();
           /* if (!await initStock()) {
                console.log("initPress error");
            }*/

        } catch (e) {
            logger.error(e)
            logger.info("init_err")
        }
    }

    async engine_start() {

        if (!await initPress()) {
            console.log("initPress error");
        }

        if (!await initAPIResource()) {
            console.log("initAPIResource error");
        }

        const searchIdx = await searchApiIdx(RSEARCHAPI);

        if (searchIdx > -1) {
            if(Common_service.search_api_idx.search !== searchIdx){
                console.log(`${Common_service.search_api[Common_service.search_api_idx?.search]?.api_name ?? ''} Changed searchIdx => ${Common_service.search_api[searchIdx]?.api_name }`);
                Common_service.search_api_idx.search = searchIdx;
            }
        }

        const trendIdx = await searchApiIdx(RTRENDAPI);
        if (trendIdx > -1) {
            if(Common_service.search_api_idx.trend !== trendIdx){
                console.log(`${Common_service.search_api[Common_service?.search_api_idx.trend]?.api_name ?? ''} Changed trendIdx => ${Common_service.search_api[trendIdx].api_name }`);
                Common_service.search_api_idx.trend = trendIdx;
            }
        }

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
