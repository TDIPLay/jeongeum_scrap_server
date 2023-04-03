import {getDateString, logger} from "../helpers/utils";
import {Query} from "mysql";
import mysql from "../../service/mysql";
import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import {AXIOS_OPTIONS, emailRegex} from "../helpers/common";
import {News, PageInfo, SearchNews} from "../interfaces/talk_struct";
import service from "../../service/common_service";
import {KakaoTalkMessage, sendKakaoTalkMessage} from "./kakaotalk";
import cron from 'node-cron';
import moment from 'moment'

export const initRedisHmSet = (key: string, redis, result: string, expire: number) => {
    redis.hmset(key, {data: result, "update_time": getDateString("default")}, (err) => {

        if (!err) redis.expire(key, expire)
        else logger.error({err})
    });
}

export const query = async (query: string, val: []): Promise<Query> => {
    return await mysql.getInstance().query(query, val);
}


export async function getArticleDetails(news: News, axiosOptions: any, thumbnail: number): Promise<void> {

    try {

        const {data} = await axios.get(news.link, axiosOptions);
        const $ = cheerio.load(data);

        const main = $('div#ct > div.media_end_head.go_trans > div.media_end_head_info.nv_notrans');

        const author = $('.byline_s').text();
        const emailRegex = /\S+@\S+\.\S+/;
        const emailIndex = emailRegex.test(author) ? author.indexOf('(') > -1 ? author.lastIndexOf('(') + 1 : author.lastIndexOf(' ') + 1 : null;
        const email = emailIndex ? author.indexOf('(') > -1 ? author.substring(emailIndex, author.length - 1) : author.substring(emailIndex, author.length) : null;
        const name = email ? author.split(email)[0].replace("(", "").trim() : author;
        const content = $('#dic_area').first().text().replace(/\s/g, '').trim();
        const description = news.description ? news.description : `${$('meta[property^="og:description"]').attr('content')}...`
        const company = news.company ? news.company : $('meta[name^="twitter:creator"]').attr('content');
        const thumbnail = news.thumbnail ? news.thumbnail : $('meta[property^="og:image"]').attr('content');
        const originalLink = news.originalLink ? news.originalLink : $(main).find('a').attr('href') ?? '';

        if (originalLink) news.originalLink = originalLink;
        if (thumbnail) news.thumbnail = thumbnail;
        if (company) news.company = company;
        if (description) news.description = description;
        if (author) news.author = author;
        if (email && email.includes('@')) news.email = email;
        if (author) news.name = name;
        if (content) news.content = content;

        if (news.pubDate) {
            news.timestamp = moment(news.pubDate).unix();
            news.pubDate = moment.unix(news.timestamp).format("YYYY-MM-DD HH:mm:ss")
        } else {
            const date = $(main).find("span.media_end_head_info_datestamp_time._ARTICLE_DATE_TIME").attr('data-date-time')
            news.pubDate = moment(new Date(date).getTime()).format("YYYY-MM-DD HH:mm:ss")
            news.timestamp = new Date(date).getTime() / 1000;
        }


        // $timestamp = strtotime($date_str);
        //if (author) news.name = match ? author.replace(/\(.+\)/g, '').trim() : author;

    } catch (error) {
        console.error(`Error fetching article: ${error.message} => ${news.title}`);
    }
}

export async function getNaverNews(): Promise<PageInfo> {

    axiosRetry(axios, {
        retries: 2,
        retryDelay: (retryCount) => {
            return retryCount * 5000; // 1초, 2초, 3초
        },
        shouldResetTimeout: true,
    });

    // @ts-ignore
    const {data} = await axios.get("https://news.naver.com/main/ranking/popularDay.naver", AXIOS_OPTIONS);
    const content = iconv.decode(data, "EUC-KR").toString();
    const cheerio = require('cheerio');
    const $ = cheerio.load(content);

    const pageInfo: PageInfo = {};

    $(".rankingnews_box").each((index, block) => {

        const company = $(block).find(".rankingnews_name").text().trim();
        if (!company) return;

        const newsList = $(block).find(".rankingnews_list > li").map((index, news) => {
            return {
                title: $(news).find(".list_content > a").text().trim(),
                link: $(news).find("a").attr("href") ?? '',
                originalLink: '',
                thumbnail: $(news).find("a > img").attr("src") ?? '',
                company: company,
                author: '',
                name: '',
                email: '',
            };
        }).get();

        pageInfo[company] = newsList;
    });

    const articlePromises: Promise<void>[] = [];
    Object.values(pageInfo).flatMap(newsList => newsList.filter(news => news.link && news.link.includes("http")))
        .forEach(news => articlePromises.push(getArticleDetails(news, AXIOS_OPTIONS, 0)));
    await Promise.all(articlePromises);

  /*  const CHUNK_SIZE = 10;
    const articlePromises: Promise<void>[] = [];
    for (let i = 0; i < newsList.length; i += CHUNK_SIZE) {
        const newsChunk = newsList.slice(i, i + CHUNK_SIZE);
        const promises = newsChunk.map((news) => getArticleDetails(news, AXIOS_OPTIONS, 0));
        articlePromises.push(...promises);
        await Promise.all(promises);
    }*/

    return pageInfo;
}


export async function getNaverRealNews(): Promise<PageInfo> {

    axiosRetry(axios, {
        retries: 2,
        retryDelay: (retryCount) => {
            return retryCount * 1000; // 1초, 2초, 3초
        },
        shouldResetTimeout: true,
    });

    // @ts-ignore
    const {data} = await axios.get("https://news.naver.com", AXIOS_OPTIONS);
    const content = iconv.decode(data, "EUC-KR").toString();
    const cheerio = require('cheerio');
    const $ = cheerio.load(content);

    const pageInfo: PageInfo = {};

    $("div.main_brick").each((index, block) => {

        const company = $(block).find(".channel").text().trim();
        if (!company) return;

        const newsList = $(block).find(".cc_text_list > li").map((index, news) => {
            return {
                title: $(news).find(".cc_text_item > a").text().trim(),
                link: $(news).find("a").attr("href") ?? '',
                originalLink: '',
                //   thumbnail: $(news).find("a > img").attr("src") ?? '',
                company: company,
                author: '',
                name: '',
                email: '',
            };
        }).get();

        pageInfo[company] = newsList;
    });
    const articlePromises: Promise<void>[] = [];
    Object.values(pageInfo).flatMap(newsList => newsList.filter(news => news.link && news.link.includes("http")))
        .forEach(news => articlePromises.push(getArticleDetails(news, AXIOS_OPTIONS, 0)));
    await Promise.all(articlePromises);

    return pageInfo;
}

/*async function getNewLinks(query: string, oldLinks: string[] = []) {

    const url = `https://search.naver.com/search.naver?where=news&query=${query}&sm=tab_opt&sort=1&photo=0&field=0&pd=0&ds=&de=&docid=&related=0&mynews=0&office_type=0&office_section_code=0&news_office_checked=&nso=so%3Add%2Cp%3Aall&is_sug_officeid=0`;

    // html 문서 받아서 파싱(parsing)
    const {data} = await axios.get(url);
    const $ = cheerio.load(data);

    // 해당 페이지의 뉴스기사 링크가 포함된 html 요소 추출
    const newsTitles = $("a.news_tit");

    // 요소에서 링크만 추출해서 리스트로 저장
    const newLinks = Array.from(newsTitles).map((title) => $(title).attr("href"));

    // 기존의 링크와 신규 링크를 비교해서 새로운 링크만 저장
    const uniqueLinks = Array.from(new Set(newLinks));
    const diffLinks = uniqueLinks.filter((link) => !oldLinks.includes(link));

    return diffLinks;
}*/


// query	String	Y	검색어. UTF-8로 인코딩되어야 합니다.
// display	Integer	N	한 번에 표시할 검색 결과 개수(기본값: 10, 최댓값: 100)
// start	Integer	N	검색 시작 위치(기본값: 1, 최댓값: 1000)
// sort	String	N	검색 결과 정렬 방법
// - sim: 정확도순으로 내림차순 정렬(기본값)
// - date: 날짜순으로 내림차순 정렬

async function getNewLinks(query: string, oldLinks: string[] = [], start:number = 1) {
    // (주의) 네이버에서 키워드 검색 - 뉴스 탭 클릭 - 최신순 클릭 상태의 url
    let api_url = 'https://openapi.naver.com/v1/search/news.json?query=' + encodeURI(query) + "&display=100"; // JSON 결과
    let options = {
        headers: {
            'X-Naver-Client-Id': process.env["NAVER_CLIENT_ID"],
            'X-Naver-Client-Secret': process.env["NAVER_CLIENT_SECRET"],
            withCredentials: true
        }
    };
    const {data} = await axios.get(api_url, options);

    // 요소에서 링크만 추출해서 리스트로 저장
    //const newLinks = Array.from(data.items).map((news:SearchNews) => news?.link);
    // 기존의 링크와 신규 링크를 비교해서 새로운 링크만 저장
    const uniqueLinks = Array.from(new Set(data.items));
    const diffLinks = uniqueLinks.filter((item: SearchNews) =>  item.link.includes("naver") && !oldLinks.includes(item.link));
    const newLinks = Array.from(diffLinks).map((news: SearchNews) => news?.link);
    service.oldLinks = [...newLinks, ...service.oldLinks];

    return diffLinks;
}

export async function getNews(query: string, start:number = 1) {

    let api_url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURI(query)}&display=100&start=${start}`; // JSON 결과
    let options = {
        headers: {
            'X-Naver-Client-Id': process.env["NAVER_CLIENT_ID"],
            'X-Naver-Client-Secret': process.env["NAVER_CLIENT_SECRET"],
            withCredentials: true
        }
    };
    const {data} = await axios.get(api_url, options);

    return data.items.filter(news => news.link && news.link.includes("http") && news.link.includes("naver"));
}


export async function sendLinks(query: string) {

    // 새로운 메시지가 있으면 링크 전송
    const newLinks = await getNewLinks(query, service.oldLinks,1);

    /*console.log(service.oldLinks)
    console.log("=====================================================================================")*/
    console.log(Array.from(newLinks).map((news: SearchNews) => news?.link))

    if (newLinks.length > 0) {
        if (service.kakao_a_key) {
            newLinks.forEach((item: SearchNews) => {
                const message: KakaoTalkMessage = {
                    'object_type': 'text',
                    'text': item.title + item.link,
                    'link': {
                        web_url: "",
                        mobile_web_url: "",
                    },
                    'button_title': "바로 확인"
                }
                // sendKakaoTalkMessage(message);
            });

        }
    }
    return newLinks;
}

function test() {

    // 검색할 키워드 설정
    const queries = ["부동산", "경제", "날씨"];

    for (const query of queries) {

        // 기존에 보냈던 링크를 담아둘 리스트 만들기
        const old_links: string[] = [];

        // 주기적 실행과 관련된 코드 (hours는 시, minutes는 분, seconds는 초)
        const job = cron.schedule('*/10 * * * * *', () => {
            sendLinks(query);
        });
    }
}
