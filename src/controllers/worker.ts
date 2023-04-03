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
        const emailIndex = author.indexOf('(') > -1 ? author.lastIndexOf('(') + 1 : author.lastIndexOf(' ') + 1;
        const email = author.indexOf('(') > -1 ? author.substring(emailIndex, author.length - 1) : author.substring(emailIndex, author.length);
        const name = author.split(email)[0].replace("(", "").trim()
        const description = news.description ? news.description : $('meta[property^="og:description"]').attr('content')

        if (thumbnail) {
            news.thumbnail = $('meta[property^="og:image"]').attr('content');
        } else {
            news.originalLink = $(main).find('a').attr('href') ?? '';
        }

        news.company = news.company ? news.company : $('meta[name^="twitter:creator"]').attr('content');

        if (description) news.description = description;
        if (author) news.author = author;
        if (email && email.includes('@')) news.email = email;
        if (author) news.name = name;

        if (news.pubDate) {
            news.timestamp = moment(news.pubDate).unix();
        } else {
            const date = $(main).find("span.media_end_head_info_datestamp_time._ARTICLE_DATE_TIME").attr('data-date-time')
            news.pubDate = date;
            news.timestamp = new Date(date).getTime() / 1000;
        }


        // $timestamp = strtotime($date_str);
        //if (author) news.name = match ? author.replace(/\(.+\)/g, '').trim() : author;

    } catch (error) {
        console.error(error);
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
    console.log("test")
    const headlines = $('div.hdline_news').find('li > div > a');
    headlines.each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        console.log(`${title}: ${link}`);
    });


    $("div.main_brick").each((index, block) => {
        console.log("start")
        const company = $(block).find(".channel").text().trim();
        console.log($(block).html())
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


async function getNewLinks(query: string, oldLinks: string[] = []) {
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

export async function getNews(query: string, oldLinks: string[] = []) {

    let api_url = 'https://openapi.naver.com/v1/search/news.json?query=' + encodeURI(query) + "&display=100"; // JSON 결과
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
    const newLinks = await getNewLinks(query, service.oldLinks);

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
