import mysql from "./mysql"
import cron from 'node-cron';
import {getDateString, logger} from "../src/helpers/utils";
import {initAPIResource, initPress, searchApiIdx} from "../src/controllers/engine"
import {processKeywordAlarms} from "../src/controllers/user";
import {KeywordAlarm, SearchApi} from "../src/interfaces";
import {R_SEARCH_API, R_TREND_API} from "../src/helpers/common";

export default class Common_service {

    private static INSTANCE: Common_service;
    static server_info: any = {};
    static alarm_info: { [p: string]: KeywordAlarm } = {};
    static apis:SearchApi[]= [];
    static apiIdx = {search: -1, trend: -1};
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
        //dataSet
        cron.schedule("*/10 * * * *", async () => {
            logger.info(getDateString(0, 'default'));
            await this.module_start();
        });

        //datalap api의 경우 1분마다 api 상태를 확인하고 사용량이 적은 api로 변경
        cron.schedule("*/1 * * * *", async () => {
            // 트렌트 API 인덱스 확인 및 업데이트
            Common_service.apiIdx.trend = await this.checkAndUpdateApiIndex(R_TREND_API, Common_service.apis, Common_service.apiIdx.trend);
        });
    }

    //시작 /10분마다 실행
    async module_start() {
        logger.info("init_start")
        try {
            //알람전송 데이터셋
            if (!await processKeywordAlarms()) {
                console.log("processKeywordAlarms error");
            }

            //언론사를 페이지에서 찾지 못할경우를 위해 redis에 저장 후 사용
            if (!await initPress()) {
                console.log("initPress error");
            }

            //api 사용량 초기화
            if (!await initAPIResource()) {
                console.log("initAPIResource error");
            }

            // 검색 API 인덱스 확인 및 업데이트
            Common_service.apiIdx.search = await this.checkAndUpdateApiIndex(R_SEARCH_API, Common_service.apis, Common_service.apiIdx.search);

            // 트렌트 API 인덱스 확인 및 업데이트
            Common_service.apiIdx.trend = await this.checkAndUpdateApiIndex(R_TREND_API, Common_service.apis, Common_service.apiIdx.trend);

            //신규 상장사 추가시 DB에 데이터 적재후 실행
           /* if (!await initStock()) {
                console.log("initPress error");
            }*/

        } catch (e) {
            logger.error(e)
            logger.info("init_err")
        }
    }

    async checkAndUpdateApiIndex(apiType, apiArray, apiIndex) {
        const newIndex = await searchApiIdx(apiType);
        if (newIndex > -1 && apiIndex !== newIndex) {
            console.log(`${apiArray[apiIndex]?.api_name ?? ''} Changed ${apiType}Idx => ${apiArray[newIndex]?.api_name}`);
            apiIndex = newIndex;
        }
        return apiIndex;
    }

    sql_release() {
        mysql.getInstance().release().then(err => console.log(err))
    }

}
