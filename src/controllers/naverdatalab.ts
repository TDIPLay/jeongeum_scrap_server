import {getApiClientKey} from "./engine";
import {NAVER_API_URL, R_SEARCH_API, R_TREND_API} from "../helpers/common";
import axios from 'axios';
import moment from "moment";
import {generate} from "../helpers/utils";

interface AgeRatio {
    age_10: number;
    age_20: number;
    age_30: number;
    age_40: number;
    age_50: number;
}

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
    monthlyPcQcCnt: number | string;
    monthlyMobileQcCnt: number | string;
};

type PeriodData = {
    totalCount: number;
    //mobileCount: number;
    //pcCount: number;
    period: string;
    ratio: number;
    //mobileRatio: number;
    //pcRatio: number;
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
    cafeCount: number;
    newsCount: number;
    pcCount: number | string;
    mobileCount: number | string;
    rate: RateData;
    daily: PeriodData[];
};

interface AgeRatio {
    [ageGroup: string]: number;
}

interface AgeGroupData {
    period: string;
    ratio: number;
}

interface AgeGroupDataCollection {
    [ageGroup: string]: AgeGroupData[];
}


async function getSearchRate(query: string, start?: string, end?: string): Promise<any> {
    const {client_id, client_secret} = await getApiClientKey(R_TREND_API, 9);

    const apiUrl = 'https://openapi.naver.com/v1/datalab/search';
    const headers = {
        'X-Naver-Client-Id': client_id,
        'X-Naver-Client-Secret': client_secret,
        'Content-Type': 'application/json',
    };

    const monthAgo = moment().subtract(1, 'month').format('YYYY-MM-DD');
    const startDate = start && moment(start).isAfter(monthAgo) ? monthAgo : start || monthAgo;
    const endDate = /*end ||*/ moment().subtract(1, 'day').format('YYYY-MM-DD');

    const searchData = {
        startDate,
        endDate,
        timeUnit: 'date',
        keywordGroups: [{groupName: query, keywords: query.split(',')}],
        ages: [],
        gender: '',
        device: '',
    };

    const searchByGender = async (gender: string): Promise<any> => {
        return axios.post(apiUrl, {
            ...searchData,
            timeUnit: 'month',
            gender
        }, {headers}).then((res) => res.data.results[0].data);
    };

    const searchByAge = async (ages: string[]): Promise<any> => {
        return axios.post(apiUrl, {
            ...searchData,
            timeUnit: 'month',
            ages
        }, {headers}).then((res) => res.data.results[0].data);
    };

    const [resultsAll, resultsFemale, resultsMale, resultsAge10, resultsAge20, resultsAge30, resultsAge40, resultsAge50] =
        await Promise.all([
            axios.post(apiUrl, searchData, {headers}).then((res) => res.data.results[0].data),
            searchByGender('f'),
            searchByGender('m'),
            searchByAge(['1', '2']),
            searchByAge(['3', '4']),
            searchByAge(['5', '6']),
            searchByAge(['7', '8']),
            searchByAge(['9', '10']),
        ]);

    return {
        rate: resultsAll,
        female: resultsFemale,
        male: resultsMale,
        age_10: resultsAge10,
        age_20: resultsAge20,
        age_30: resultsAge30,
        age_40: resultsAge40,
        age_50: resultsAge50,
    };
}

// https://openapi.naver.com/v1/search/blog.json
//     https://api.naver.com/keywordstool
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

    //relKeyword top 10
    const sortedNews = response.data.keywordList
        .filter(v => v.relKeyword !== query) // exclude query data
        .sort((a, b) => (b.monthlyPcQcCnt + b.monthlyMobileQcCnt) - (a.monthlyPcQcCnt + a.monthlyMobileQcCnt))
        .slice(0, 30);

    const searchRel = sortedNews.filter(v => v.relKeyword !== query).map(v => v.relKeyword)

    const monthlyData: MonthlyData = {
        relKeyword: response.data.keywordList[0].relKeyword,
        monthlyPcQcCnt: response.data.keywordList[0].monthlyPcQcCnt,
        monthlyMobileQcCnt: response.data.keywordList[0].monthlyMobileQcCnt,
    };

    const dataBlog = await getRelBlogCount(query, 1);
    const dataCafe = await getRelCafeCount(query, 1);
    const dataNews = await getRelNewsCount(query, 1);
    const data = await getSearchRate(query, start, end);
    const {rate, female, male, age_10, age_20, age_30, age_40, age_50} = data;
    /*   const periodData: PeriodData[] = mobile.map((item: any, idx) => ({
               period: item.period,
               mobileRatio: item.ratio,
               pcRatio: pc[idx]?.ratio || 0
       }));
    const periodData: any[] = [];
    */
    // const rateMap = new Map(rate.map(({period, ratio}) => [period, ratio]));
    // const pcMap = new Map(pc.map(({period, ratio}) => [period, ratio]));

    //const allPeriods = [...new Set([...mobile.map((item) => item.period), ...pc.map((item) => item.period)])];

    /*for (const period of allPeriods) {
        const mobileRatio = mobileMap.get(period) || 0;
        const pcRatio = pcMap.get(period) || 0;
        periodData.push({period, mobileRatio, pcRatio});
    }*/
    const gender = getGenderRatios({female, male})
    const age = getAgeRatios({age_10, age_20, age_30, age_40, age_50})
    const filteredData = rate.filter(dailyRatio => dailyRatio.period >= start && dailyRatio.period <= end);

    // @ts-ignore
    const dailyData: DailyData = {

        title: monthlyData.relKeyword ?? query,
        keywords: [monthlyData.relKeyword] ?? [],
        relKeywords: searchRel ?? [],
        blogCount: dataBlog ?? 0,
        cafeCount: dataCafe ?? 0,
        newsCount: dataNews ?? 0,
        rate: {
            female: gender.female ?? 0,
            male: gender.male ?? 0,
            age_10: age.age_10 ?? 0,
            age_20: age.age_20 ?? 0,
            age_30: age.age_30 ?? 0,
            age_40: age.age_40 ?? 0,
            age_50: age.age_50 ?? 0
        },
        pcCount: (typeof monthlyData.monthlyPcQcCnt) === 'string' ? 0 : monthlyData.monthlyPcQcCnt,
        mobileCount: (typeof monthlyData.monthlyMobileQcCnt) === 'string' ? 0 : monthlyData.monthlyMobileQcCnt,
        daily: filteredData,
    };

    const allRatioSum = rate.slice().reverse().slice(0, 30).reduce((sum, value) => {
        return sum + value.ratio;
    }, 0);

    // @ts-ignore
    const sumPercent = (dailyData.pcCount + dailyData.mobileCount) / allRatioSum;

    dailyData.daily.forEach((item) => {
        item.totalCount = Math.round(sumPercent * item.ratio);
    });
    return dailyData;
}


function getGenderRatios(ratios: any): Record<string, number> {
    const femaleRatio = (ratios.female.reduce((acc, curr) => acc + curr.ratio, 0));
    const maleRatio = (ratios.male.reduce((acc, curr) => acc + curr.ratio, 0));
    const totalRatio = femaleRatio + maleRatio;
    const femalePercentage = parseFloat(((femaleRatio / totalRatio) * 100).toFixed(2))
    const malePercentage = parseFloat(((maleRatio / totalRatio) * 100).toFixed(2));
    return {
        female: femalePercentage,
        male: malePercentage,
    };
}


function getAgeRatios(data: AgeGroupDataCollection): AgeRatio {
    const ageRatios: AgeRatio = {age_10: 0, age_20: 0, age_30: 0, age_40: 0, age_50: 0};
    let totalRatio = 0;

    Object.keys(data).forEach((ageGroup) => {
        const ageGroupData = data[ageGroup];
        const currentRatio = ageGroupData.reduce((acc, curr) => acc + curr.ratio, 0);
        ageRatios[ageGroup] = currentRatio;
        totalRatio += currentRatio;
    });

    Object.keys(ageRatios).forEach((ageGroup) => {
        ageRatios[ageGroup] = parseFloat(((ageRatios[ageGroup] / totalRatio) * 100).toFixed(2));
    });

    return ageRatios;
}


async function getRelBlogCount(query: string, start: number = 1): Promise<number> {
    const clientInfo = await getApiClientKey(R_SEARCH_API, 1);
    let api_url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURI(query)}&start=${start}&display=1`; // JSON 결과
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


async function getRelCafeCount(query: string, start: number = 1): Promise<number> {
    const clientInfo = await getApiClientKey(R_SEARCH_API, 1);
    let api_url = `https://openapi.naver.com/v1/search/cafearticle.json?query=${encodeURI(query)}&start=${start}&display=1`; // JSON 결과
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

async function getRelNewsCount(query: string, start: number = 1): Promise<number> {
    const clientInfo = await getApiClientKey(R_SEARCH_API, 1);
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
