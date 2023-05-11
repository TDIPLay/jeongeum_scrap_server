import axios from 'axios';
import moment from "moment";
import {AlarmData, KeywordAlarm} from "../interfaces";
import {ALARM} from "../helpers/common";


const AXIOS_OPTIONS = {
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 5000,
};


export function processKeywordAlarms(alarms: AlarmData[]): { [p: string]: KeywordAlarm } {
    const keywordAlarms: { [email: string]: KeywordAlarm } = {};

    // 각 알람에 대해
    for (const alarm of alarms) {
        // 알람의 시작 시간과 종료 시간을 Timestamp로 변환
        const start_time = moment(alarm.alarm_start_time, "HH:mm:ss.SSSSSS").valueOf();
        const end_time = moment(alarm.alarm_end_time, "HH:mm:ss.SSSSSS").valueOf();
        const alarm_type = alarm.alarm_type;
        // 알람 메일 주소/ 폰전화번호를 key로 하는 object에 해당 키워드 알람을 추가
        const key = alarm_type === ALARM.email ? alarm.alarm_mail : alarm.alarm_phone_number;

        if (!keywordAlarms[key]) {
            keywordAlarms[key] = {
                start_time,
                end_time,
                alarm_type,
                keyword: []
            };
        }
        keywordAlarms[key].keyword.push(alarm.keyword);
    }
    return keywordAlarms;
}

export function getAlarmsUser( query: string, keywordAlarms: { [email: string]: KeywordAlarm }) {
    const now = moment().valueOf();

    let alarmEmailUser = []
    let alarmTalkUser = []
    for (const alarmKey in keywordAlarms) {
        const keywordAlarmList: KeywordAlarm = keywordAlarms[alarmKey];
        const activeKeywordAlarms = now >= keywordAlarmList.start_time && now <= keywordAlarmList.end_time
        if (activeKeywordAlarms) {
            const shouldSend = keywordAlarmList.keyword.indexOf(query);
            if (keywordAlarmList.alarm_type === ALARM.email) {
                if (shouldSend > -1) alarmEmailUser.push(alarmKey)
            } else if (keywordAlarmList.alarm_type === ALARM.kakao) {
                if (shouldSend > -1) alarmTalkUser.push(alarmKey)
            }
        }
    }
    return {alarmEmailUser, alarmTalkUser}
}

export async function createUser(user: any): Promise<any> {
    try {
        const objParams = {
            division: user.division,
            account_id: user.email,
            name: user.name,
            sns_token: user.token,
            sns_type: user.type,
            phone_number: user.mobile,
            account_type: 3,
            auth_level: 2,
        }
        // console.log(objParams)
        const res = await axios.post(`${process.env['NEWS_API']}/User/ManagerSnsProcess`, objParams, AXIOS_OPTIONS);

        return res.data;
    } catch (error) {
        console.log(error)
        return error;
    }
}
