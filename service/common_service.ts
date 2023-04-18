import mysql from "./mysql"
import {getRedis} from './redis'
import cron from 'node-cron';
import {getDateString, logger} from "../src/helpers/utils";
import {xServerError} from "../src/helpers/errors";
import {getNewsScap} from "../src/controllers/engine"
import {initRedisHmSet} from "../src/controllers/worker";
import Mysql from "./mysql";
import {getAlarmsUser, processKeywordAlarms} from "../src/controllers/user";
import {AlarmData, KeywordAlarm} from "../src/interfaces";

export default class Common_service {

    private static INSTANCE: Common_service;
    static server_info: any = {};
    static alarm_info : {[p: string]: KeywordAlarm} = {};
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
            logger.info(getDateString(0,'default'));
            await this.module_start();
        });
    }

    async module_start() {
        logger.info("init_start")

         const mysql = Mysql.getInstance()
        const query = "SELECT \n" +
            "KA.user_keyword_no, \n" +
            "UK.keyword,\n" +
            "KA.alarm_start_time, \n" +
            "KA.alarm_end_time, \n" +
            "KA.alarm_type, \n" +
            "KA.alarm_mail, \n" +
            "KA.alarm_phone_number \n" +
            "FROM \n" +
            "keyword_alarm KA\n" +
            "LEFT JOIN\n" +
            "user_keyword UK\n" +
            "ON\n" +
            "KA.user_keyword_no = UK.keyword_no\n" +
            "WHERE \n" +
            "KA.alarm_type = 1"
        const result : AlarmData[] = JSON.parse(JSON.stringify(await mysql.query(query)));
        Common_service.alarm_info  =  processKeywordAlarms(result)
    }

    async engine_start() {

        //jab 돌릴예정
        if (!await getNewsScap()) {
            console.log("getNewsScap error");
        }

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
