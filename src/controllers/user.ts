import axios, {AxiosRequestConfig, ResponseType} from 'axios';
import moment from "moment";
import {AlarmData, KeywordAlarm} from "../interfaces";


const AXIOS_OPTIONS = {
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 5000,
};



export function processKeywordAlarms(alarms: AlarmData[]): {[p: string]: KeywordAlarm} {
    const keywordAlarms: { [email: string]: KeywordAlarm } = {};

    // 각 알람에 대해
    for (const alarm of alarms) {
        // 알람의 시작 시간과 종료 시간을 Timestamp로 변환
        const start_time = moment(alarm.alarm_start_time, "HH:mm:ss.SSSSSS").valueOf();
        const end_time = moment(alarm.alarm_end_time, "HH:mm:ss.SSSSSS").valueOf();

        // 알람 메일 주소를 key로 하는 object에 해당 키워드 알람을 추가
        if (!keywordAlarms[alarm.alarm_mail]) {
            keywordAlarms[alarm.alarm_mail] = {
                start_time,
                end_time,
                keyword: []
            };
        }

        keywordAlarms[alarm.alarm_mail].keyword.push(alarm.keyword);
    }
    return keywordAlarms;
}

export function getAlarmsUser(query:string, keywordAlarms: { [email: string]: KeywordAlarm }) {
    const now = moment().valueOf();

    let alarmUser = []
    for (const email in keywordAlarms) {
        const keywordAlarmList: KeywordAlarm  = keywordAlarms[email];

        const activeKeywordAlarms = now >= keywordAlarmList.start_time && now <= keywordAlarmList.end_time
        if(activeKeywordAlarms){
            const shouldSendEmail = keywordAlarmList.keyword.indexOf(query);
            if(shouldSendEmail > -1) alarmUser.push(email)
        }
    }
    return alarmUser
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
        console.log(objParams)
        const res = await axios.post(`${process.env['NEWS_API']}/User/ManagerSnsProcess`, objParams ,AXIOS_OPTIONS);

        return res.data;
    } catch (error) {
        console.log(error)
        return error;
    }
}
