import {NewsItem} from "../interfaces";
import {getApiClientKey} from "./engine";
import {NAVER_API_URL} from "../helpers/common";
import axios, {AxiosResponse} from 'axios';
import moment from "moment";
import {generate} from "../helpers/utils";


interface Keyword {
    relKeyword: string;
    monthlyPcQcCnt: number;
    monthlyMobileQcCnt: number;
    monthlyAvePcClkCnt: number;
    monthlyAveMobileClkCnt: number;
    monthlyAvePcCtr: number;
    monthlyAveMobileCtr: number;
    plAvgDepth: number;
    compIdx: number;
}

interface ApiResponse {
    keywordList: Keyword[];
}

type MonthlyData = {
    relKeyword: string;
    monthlyPcQcCnt: number;
    monthlyMobileQcCnt: number;
};

type PeriodData = {
    totalCount: number;
    mobileCount: number;
    pcCount: number;
    period: string;
    mobileRatio: number;
    pcRatio: number;
};
type RateData = {
    female: number;
    male: number;
    age_10: number;
    age_20: number;
    age_30: number;
    age_40: number;
    age_50: number;
};

type DailyData = {
    title: string;
    keywords: string[];
    relKeywords: string[];
    blogCount: number;
    newsCount: number;
    pcCount: number;
    mobileCount: number;
    rate: RateData;
    daily: PeriodData[];
};

/*export async function getSearchRate(query, start, end) {
    const clientInfo = await getApiClientKey();
    let api_url = `https://openapi.naver.com/v1/datalab/search`; // JSON 결과
    let options = {
        headers: {
            'X-Naver-Client-Id': clientInfo.client_id,
            'X-Naver-Client-Secret': clientInfo.client_secret,
            'Content-Type': 'application/json'
        }
    };

    const startDate = start || moment().subtract(1, 'day').format('YYYY-MM-DD');
    const endDate = end || moment().format('YYYY-MM-DD');
    let data = {
        "startDate": startDate,
        "endDate": endDate,
        "timeUnit": "date",
        "device": 'mo',
        "keywordGroups": [
            {
                "groupName": query,
                "keywords": query.split(',')
            }
        ],
        "ages": [],
        "gender": ""
    };
    //남성, 여성

    try {
        //mo
        const response_mo = await axios.post(api_url, data, options);
        const results_mo = response_mo.data.results[0].data;
        //pc
        data.device = 'pc';
        const response_pc = await axios.post(api_url, data, options);
        const results_pc = response_pc.data.results[0].data;

        //전체데이터  여성
        data.timeUnit = "month";
        data.device = '';
        data.gender = 'f';
        const response_female = await axios.post(api_url, data, options);
        const results_female = response_pc.data.results[0].data;

        data.gender = 'm';
        const response_male = await axios.post(api_url, data, options);
        const results_male = response_pc.data.results[0].data;
        //10대,20대,30대,40대,50대
        data.device = '';
        data.gender = '';
        data.ages.push("1","2")
        const response_10 = await axios.post(api_url, data, options);
        const results_10 = response_pc.data.results[0].data;


        console.log(results_mo)

        return {"data": {"mobile": results_mo, "pc": results_pc}};
    } catch (error) {
        console.error(error);
    }
}*/


async function getSearchRate(query: string, start?: string, end?: string) {
    const { client_id, client_secret } = await getApiClientKey();
    const api_url = 'https://openapi.naver.com/v1/datalab/search'; // JSON 결과
    const options = {
        headers: {
            'X-Naver-Client-Id': client_id,
            'X-Naver-Client-Secret': client_secret,
            'Content-Type': 'application/json'
        }
    };

    const startDate = start ?? moment().subtract(1, 'day').format('YYYY-MM-DD');
    const endDate = end ?? moment().format('YYYY-MM-DD');

    const data = {
        startDate,
        endDate,
        timeUnit: 'date',
        device: 'mo',
        keywordGroups: [
            {
                groupName: query,
                keywords: query.split(',')
            }
        ],
        ages: [],
        gender: ''
    };

    const [results_mo, results_pc, results_female, results_male, results_10, results_20, results_30, results_40, results_50] = await Promise.all([
        axios.post(api_url, data, options).then(response => response.data.results[0].data),
        axios.post(api_url, { ...data, device: 'pc' }, options).then(response => response.data.results[0].data),
        axios.post(api_url, { ...data, timeUnit: 'month', device: '', gender: 'f' }, options).then(response => response.data.results[0].data),
        axios.post(api_url, { ...data, timeUnit: 'month', device: '', gender: 'm' }, options).then(response => response.data.results[0].data),
        axios.post(api_url, { ...data, timeUnit: 'month', device: '', gender: '', ages: ["1","2"] }, options).then(response => response.data.results[0].data),
        axios.post(api_url, { ...data, timeUnit: 'month', device: '', gender: '', ages: ["3","4"] }, options).then(response => response.data.results[0].data),
        axios.post(api_url, { ...data, timeUnit: 'month', device: '', gender: '', ages: ["5","6"] }, options).then(response => response.data.results[0].data),
        axios.post(api_url, { ...data, timeUnit: 'month', device: '', gender: '', ages: ["7","8"] }, options).then(response => response.data.results[0].data),
        axios.post(api_url, { ...data, timeUnit: 'month', device: '', gender: '', ages: ["9","10"] }, options).then(response => response.data.results[0].data),
    ]);

    return {
        mobile: results_mo,
        pc: results_pc,
        female: results_female,
        male: results_male,
        age_10: results_10,
        age_20: results_20,
        age_30: results_30,
        age_40: results_40,
        age_50: results_50
    };

    /*return {
        mobile: results_mo,
        pc: results_pc,
        female: results_female.map(({ ratio }) => ({ ratio })),
        male: results_male.map(({ ratio }) => ({ ratio })),
        age_10: results_10.map(({ ratio }) => ({ ratio })),
        age_20: results_20.map(({ ratio }) => ({ ratio })),
        age_30: results_30.map(({ ratio }) => ({ ratio })),
        age_40: results_40.map(({ ratio }) => ({ ratio })),
        age_50: results_50.map(({ ratio }) => ({ ratio }))
    };*/
}

// {"api_key": "0100000000141b6de97be2e0dc28b53c8478a7be307a14984163150d8bc486a094903beb33", "secret_key": "AQAAAAAUG23pe+Lg3Ci1PIR4p74wzaSaga4fm2MuG0k9oSuf1w==", "customer_id": "2660230"}
// {"api_key": "0100000000ebac20c49c87f54d7484dcca28e33b309f9c1f20ae434927643405db8c6742db", "secret_key": "AQAAAADrrCDEnIf1TXSE3Moo4zswMDrCRL+chZU7fF/fdJU/zA==", "customer_id": "2660231"}
// {"api_key": "0100000000791fa2ea6e26b97ce3cf27023dde23bd72b1a242d7017b6983a424107c2595b7", "secret_key": "AQAAAAB5H6Lqbia5fOPPJwI93iO9V5ILgNqNFFbf1qxzanMp5A==", "customer_id": "2660374"}
export async function getRelKeyword(query, start, end): Promise<DailyData> {
    const BASE_URL = 'https://api.naver.com';
    const API_KEY = '0100000000141b6de97be2e0dc28b53c8478a7be307a14984163150d8bc486a094903beb33';
    const SECRET_KEY = 'AQAAAAAUG23pe+Lg3Ci1PIR4p74wzaSaga4fm2MuG0k9oSuf1w==';
    const CUSTOMER_ID = '2660230';

    const uri = '/keywordstool';
    const method = 'GET';

    const headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-API-KEY': API_KEY,
        'X-Customer': CUSTOMER_ID,
    };

    const params = {
        // month: month,
        hintKeywords: query,
        showDetail: '1',
    };

    const timestamp = String(Date.now());
    const signature = generate(timestamp, method, uri, SECRET_KEY);

    headers['X-Timestamp'] = timestamp;
    headers['X-Signature'] = signature;

    const response = await axios.get<ApiResponse>(`${BASE_URL}${uri}`, {
        params,
        headers,
    });
    const sortedNews = response.data.keywordList
        .filter(v => v.relKeyword !== query) // exclude query data
        .sort((a, b) => (b.monthlyPcQcCnt + b.monthlyMobileQcCnt) - (a.monthlyPcQcCnt + a.monthlyMobileQcCnt))
        .slice(0, 10);
    const searchRel = sortedNews
        .filter(v => v.relKeyword !== query) // exclude query data
        .map(v => v.relKeyword) // extract relKeyword properties

    const monthlyData: MonthlyData = {
        relKeyword: response.data.keywordList[0].relKeyword,
        monthlyPcQcCnt: response.data.keywordList[0].monthlyPcQcCnt,
        monthlyMobileQcCnt: response.data.keywordList[0].monthlyMobileQcCnt,
    };

    const dataBlog = await getRelBlogCount(query, 1);
    const dataNews = await getRelNewsCount(query, 1);
    const {mobile, pc, female, male, age_10, age_20, age_30, age_40, age_50} = await getSearchRate(query, start, end);
    const periodData: PeriodData[] = mobile.map((item: any, index) => ({
        period: item.period,
        mobileRatio: item.ratio,
        pcRatio: pc[index].ratio
    }));

    const dailyData: DailyData = {

        title: monthlyData.relKeyword,
        keywords: [monthlyData.relKeyword],
        relKeywords: searchRel,
        blogCount: dataBlog,
        newsCount: dataNews,
        rate: {female:female, male:male, age_10:age_10, age_20:age_20, age_30:age_30, age_40:age_40, age_50:age_50},
        pcCount: monthlyData.monthlyPcQcCnt,
        mobileCount: monthlyData.monthlyMobileQcCnt,
        daily: periodData,
    };

    const mobilePercent = monthlyData.monthlyPcQcCnt / periodData[0].mobileRatio;
    const pcPercent = monthlyData.monthlyMobileQcCnt / periodData[0].pcRatio;

    dailyData.daily.forEach((item) => {
        const mo_ratio = item.mobileRatio / 100;
        const pc_ratio = item.pcRatio / 100;
        const pcCount = Math.round(pcPercent * pc_ratio);
        const mobileCount = Math.round(mobilePercent * mo_ratio);

        item.totalCount = pcCount + mobileCount;
        item.pcCount = pcCount;
        item.mobileCount = mobileCount;
    });

    // return dailyData;
    /*console.log(params)
    console.log(response.data)*/
    return dailyData;
}

async function getRelBlogCount(query: string, start: number = 1): Promise<number> {
    const clientInfo = await getApiClientKey();
    let api_url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURI(query)}&start=${start}&display=1`; // JSON 결과
    let options = {
        headers: {
            'X-Naver-Client-Id': clientInfo.client_id,
            'X-Naver-Client-Secret': clientInfo.client_secret,
            withCredentials: true
        }
    };
    const {data} = await axios.get(api_url, options);


    // const result = data.items.map(item => item.title ? {...item, "title": `${item.title}_${start}`} : '')
    return data.total
}

async function getRelNewsCount(query: string, start: number = 1): Promise<number> {
    const clientInfo = await getApiClientKey();
    let api_url = `${NAVER_API_URL}?query=${encodeURI(query)}&start=${start}&display=1`; // JSON 결과
    let options = {
        headers: {
            'X-Naver-Client-Id': clientInfo.client_id,
            'X-Naver-Client-Secret': clientInfo.client_secret,
            withCredentials: true
        }
    };
    const {data} = await axios.get(api_url, options);
    return data.total
}
