import {CafeItem, NewsItem} from "../interfaces";
import {getApiClientKey} from "./engine";
import {MAX_LINK, R_CAFE_KEYWORD, R_SEARCH_API} from "../helpers/common";
import axios from "axios";
import {hmsetRedis} from "./worker";
import {getRedis} from "../../service/redis";

export async function getNewCafeLinks(query: string, start: number, oldLinks: string[] = []): Promise<CafeItem[]> {

    // 새로운 메시지가 있으면 링크 전송
    const newLinks = await getFindCafeLinks(query, start, oldLinks || []);
    return newLinks;
}

export async function getFindCafeLinks(query: string, start: number = 1, oldLinks: string[] = []): Promise<CafeItem[]> {

    const clientInfo = await getApiClientKey(R_SEARCH_API, 1);

    let api_url = `https://openapi.naver.com/v1/search/cafearticle.json?query=${encodeURI(query)}&start=${start}&display=100&`; // JSON 결과
    let options = {
        headers: {
            'X-Naver-Client-Id': clientInfo.client_id,
            'X-Naver-Client-Secret': clientInfo.client_secret,
            withCredentials: true
        }
    };

    const {data} = await axios.get(api_url, options);
    // 기존의 링크와 신규 링크를 비교해서 새로운 링크만 저장
    const uniqueLinks = Array.from(new Set(data.items));

    const diffLinks = uniqueLinks.filter((item: CafeItem) => !oldLinks.includes(item.link));
    const newLinks = Array.from(diffLinks).map((news: CafeItem) => news?.link) || [];

    let tempLinks = oldLinks;
    const listCnt = oldLinks.length + newLinks.length;

    if (listCnt > MAX_LINK) {
        tempLinks.splice(-(listCnt - MAX_LINK));
    }
    const redisData = {[`${query}`]: JSON.stringify([...newLinks, ...tempLinks])};
    await hmsetRedis(await getRedis(), R_CAFE_KEYWORD, redisData, 0);

    return data.items.filter(cafe => cafe.link && cafe.link.includes("http") && !oldLinks.includes(cafe.link));
}

export async function getCafe(query: string, start: number, display: number = 100, sort: string = 'date'): Promise<NewsItem[]> {
    const clientInfo = await getApiClientKey(R_SEARCH_API, 1);
    let api_url = `https://openapi.naver.com/v1/search/cafearticle.json?query=${encodeURI(query)}&start=${start}&display=${display}&sort=${sort}`; // JSON 결과

    let options = {
        headers: {
            'X-Naver-Client-Id': clientInfo.client_id,
            'X-Naver-Client-Secret': clientInfo.client_secret,
            withCredentials: true
        }
    };
    const {data} = await axios.get(api_url, options);

    return data.items.filter(cafe => cafe.link && cafe.link.includes("http"));
}
