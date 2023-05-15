import {BlogItem, NewsItem, SearchNews} from "../interfaces";
import {getApiClientKey} from "./engine";
import {MAX_LINK, NAVER_API_URL, RKEYWORD, R_BlOG_KEYWORD, RSEARCHAPI} from "../helpers/common";
import axios from "axios";
import {hmsetRedis} from "./worker";
import {getRedis} from "../../service/redis";

export async function getBlogLinks(query: string, start: number, oldLinks: string[] = []): Promise<BlogItem[]> {

    // 새로운 메시지가 있으면 링크 전송
    const blogLinks = await getFindBlogLinks(query, start, oldLinks || []);
    return blogLinks;
}

export async function getFindBlogLinks(query: string, start: number = 1, oldLinks: string[] = []): Promise<BlogItem[]> {

    const clientInfo = await getApiClientKey(RSEARCHAPI, 1);

    let api_url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURI(query)}&start=${start}&display=100&`; // JSON 결과
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

    const diffLinks = uniqueLinks.filter((item: SearchNews) => !oldLinks.includes(item.link));
    const blogLinks = Array.from(diffLinks).map((news: SearchNews) => news?.link) || [];

    let tempLinks = oldLinks;
    const listCnt = oldLinks.length + blogLinks.length;

    if (listCnt > MAX_LINK) {
        tempLinks.splice(-(listCnt - MAX_LINK));
    }
    // console.log(`total : ${listCnt}`)
    // console.log(`newLinks : ${newLinks.length}`)
    // console.log(`tempLinks : ${tempLinks.length}`)
    const redisData = {[`${query}`]: JSON.stringify([...blogLinks, ...tempLinks])};
    await hmsetRedis(await getRedis(), R_BlOG_KEYWORD, redisData, 0);

    return data.items.filter(news => news.link && news.link.includes("http") && !oldLinks.includes(news.link));
}

export async function getBlog(query: string, start: number, display: number = 100, sort: string = 'date'): Promise<BlogItem[]> {
    const clientInfo = await getApiClientKey(RSEARCHAPI, 1);
    let api_url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURI(query)}&start=${start}&display=${display}&sort=${sort}`; // JSON 결과

    let options = {
        headers: {
            'X-Naver-Client-Id': clientInfo.client_id,
            'X-Naver-Client-Secret': clientInfo.client_secret,
            withCredentials: true
        }
    };
    const {data} = await axios.get(api_url, options);

    return data.items.filter(blog => blog.link && blog.link.includes("http"));
}

