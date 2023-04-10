import axios, {AxiosResponse} from 'axios';
import axiosRetry from 'axios-retry';
// import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import {News, NewsItem, Scraper, SearchNews} from "../interfaces";
import service from "../../service/common_service";
import {KakaoTalkMessage} from "./kakaotalk";
import cron from 'node-cron';
import moment from 'moment'
import {AXIOS_OPTIONS, MAX_LINK, NAVER_API_URL, NAVER_RANK_URL, RKEYWORD} from "../helpers/common";
import {decodeHtmlEntities, extractAuthorAndEmail, getDateString} from "../helpers/utils";
import {getRedis} from "../../service/redis";
import {hmsetRedis} from "./worker";


async function axiosCall(link: string): Promise<cheerio.CheerioAPI> {
    try {

        axiosRetry(axios, {
            retries: 2,
            retryDelay: (retryCount) => {
                return retryCount * 1000; // 1초, 2초, 3초
            },
            shouldResetTimeout: true,
        });

        const response: AxiosResponse = await axios.get(link, AXIOS_OPTIONS);
        const content_type = response.headers['content-type'].match(/charset=(.+)/i);
        const encoding = content_type && content_type.length ? content_type[1] : "utf-8";
        const data = encoding.toLowerCase() !== 'utf-8' ? iconv.decode(response.data, encoding) : response.data;

        return cheerio.load(data);

    } catch (error) {
        console.error(`Error axiosCall link: ${error.message} => ${link}`);
        return null;
    }
}

async function getArticleDetails(news: News): Promise<void> {

    try {

        const $ = await axiosCall(news.link);

        const main = $('div.media_end_head_info.nv_notrans');
        const author = $('.byline_s').first().text();
        const result = extractAuthorAndEmail(author);
        const name = result.map(x => x.name)
        const email = result.map(x => x.email)
        // const content = $('body').find('p').text().trim();
        // const content = $('#dic_area').first().text().replace(/\s/g, ' ').trim();
        const description = news.description || `${$('meta[property^="og:description"]').attr('content')}...`
        const company = news.company || $('meta[name^="twitter:creator"]').attr('content');
        const thumbnail = news.thumbnail || $('meta[property^="og:image"]').attr('content');
        const originallink = news.originallink || $(main).find('a').attr('href');

        if (news.title) news.title = decodeHtmlEntities(news.title);
        if (originallink) news.originallink = originallink;
        if (thumbnail) news.thumbnail = thumbnail;
        if (company) news.company = company;
        if (description) news.description = decodeHtmlEntities(description);
        if (author) news.author = author;
        if (name) news.name = JSON.stringify(name);
        if (email) news.email = JSON.stringify(email);

        // if (content) news.content = content;
        if (news.pubDate) {
            news.timestamp = moment(news.pubDate).unix();
            news.pubDate = getDateString(news.timestamp, 'unit');
        } else {
            const date = $(main).find("._ARTICLE_DATE_TIME").attr('data-date-time')
            news.pubDate = getDateString(new Date(date).getTime(), 'default');
            news.timestamp = new Date(date).getTime() / 1000;
        }

    } catch (error) {
        console.error(`Error fetching getArticleDetails: ${error.message} => ${news.title}`);
    }
}

async function fetchMetadata(url: string): Promise<any> {
    try {

        const $ = await axiosCall(url);
        if ($ === null) return null;

        const metadata: any = {};
        //const patten = "/\\s/g";
        // metadata.bady = $('body').find('p').text().trim();
        $('meta').each((i, el) => {
            const name = $(el).attr('name');
            const property = $(el).attr('property');
            const content = $(el).attr('content');

            if (content && (name || property)) {
                const key = name ? name.split(':').pop() : property.split(':').pop();
                metadata[key] = content;
            }
        });

        return metadata;

    } catch (error) {
        console.error(`Error fetchMetadata: ${error.message} => ${url}`);
    }
}

export async function getArticle(news: News): Promise<void> {
    try {
        if (news.link.includes("naver")) {
            await getArticleDetails(news);
        } else {
            await getArticleMetaDetails(news);
        }
    } catch (error) {
        console.error(`Error article: ${error.message} => ${news.title}`);
    }
}

async function getArticleMetaDetails(news: News): Promise<void> {
    try {
        const data = await fetchMetadata(news.link);

        if (data) {
            news.thumbnail = data.image ?? '';
            news.author = data.author ?? '';
            news.content = data.bady ?? '';

            const ext = extractAuthorAndEmail(news.author);
            news.name = JSON.stringify(ext.map(x => x.name)) ?? '';
            news.email = JSON.stringify(ext.map(x => x.email)) ?? '';

            news.company = (data.site_name || data.Copyright) ?? '';
            news.title = decodeHtmlEntities(news.title);
            news.description = decodeHtmlEntities(news.description) ?? '';

            if (news.pubDate) {
                news.timestamp = moment(news.pubDate).unix();
                news.pubDate = getDateString(news.timestamp, 'unit');
            } else {
                news.pubDate = data.published_time ? getDateString(new Date(data.published_time).getTime(), 'default') : "";
                news.timestamp = data.published_time ? new Date(data.published_time).getTime() / 1000 : 0;
            }
        }

    } catch (error) {
        console.error(`Error fetching getArticleMetaDetails: ${error.message} => ${news.title}`);
    }
}


export async function getNaverRankNews(): Promise<Scraper> {
    try {
        const $ = await axiosCall(NAVER_RANK_URL);

        let scrap: Scraper = {};

        $(".rankingnews_box").each((index, block) => {

            const articleID = $(block).find(".rankingnews_name").text().trim();
            if (!articleID) return;

            scrap[articleID] = $(block).find(".rankingnews_list > li").map((index, news) => {
                return {
                    title: $(news).find(".list_content > a").text().trim(),
                    link: $(news).find("a").attr("href") ?? '',
                    originallink: '',
                    thumbnail: $(news).find("a > img").attr("src") ?? '',
                    company: articleID,
                    content: '',
                    description: '',
                    author: '',
                    name: '',
                    email: '',
                };
            }).get();
        });

        const articlePromises: Promise<void>[] = [];
        Object.values(scrap).flatMap(newsList => newsList.filter(news => news.link && news.link.includes("http")))
            .forEach(news => articlePromises.push(getArticleDetails(news)));
        await Promise.all(articlePromises);

        /*  const CHUNK_SIZE = 10;
          const articlePromises: Promise<void>[] = [];
              const newsChunk = newsList.slice(i, i + CHUNK_SIZE);
          for (let i = 0; i < newsList.length; i += CHUNK_SIZE) {
              const promises = newsChunk.map((news) => getArticleDetails(news, AXIOS_OPTIONS, 0));
              articlePromises.push(...promises);
              await Promise.all(promises);
          }*/
        return scrap;

    } catch (error) {
        console.error(`Error getNaverRankNews: ${error.message}`);
    }
}


export async function getNaverRealNews(): Promise<Scraper> {
    try {
        const $ = await axiosCall(NAVER_RANK_URL);

        let scrap: Scraper = {};

        $("div.main_brick").each((index, block) => {

            const articleID = $(block).find(".channel").text().trim();
            if (!articleID) return;

            scrap[articleID] = $(block).find(".cc_text_list > li").map((index, news) => {
                return {
                    title: $(news).find(".cc_text_item > a").text().trim(),
                    link: $(news).find("a").attr("href") ?? '',
                    originallink: '',
                    //   thumbnail: $(news).find("a > img").attr("src") ?? '',
                    company: articleID,
                    content: '',
                    description: '',
                    author: '',
                    name: '',
                    email: '',
                };
            }).get();
        });

        const articlePromises: Promise<void>[] = [];
        Object.values(scrap).flatMap(newsList => newsList.filter(news => news.link && news.link.includes("http")))
            .forEach(news => articlePromises.push(getArticleDetails(news)));
        await Promise.all(articlePromises);

        return scrap;

    } catch (error) {
        console.error(`Error getNaverRankNews: ${error.message}`);
    }
}


// query	String	Y	검색어. UTF-8로 인코딩되어야 합니다.
// display	Integer	N	한 번에 표시할 검색 결과 개수(기본값: 10, 최댓값: 100)
// start	Integer	N	검색 시작 위치(기본값: 1, 최댓값: 1000)
// sort	String	N	검색 결과 정렬 방법
// - sim: 정확도순으로 내림차순 정렬(기본값)
// - date: 날짜순으로 내림차순 정렬

export async function getFindNewLinks(query: string, start: number = 1, oldLinks: string[] = []): Promise<NewsItem[]> {
    // (주의) 네이버에서 키워드 검색 - 뉴스 탭 클릭 - 최신순 클릭 상태의 url
    let api_url = `${NAVER_API_URL}?query=${encodeURI(query)}&start=${start}&display=100`; // JSON 결과
    let options = {
        headers: {
            'X-Naver-Client-Id': process.env["NAVER_CLIENT_ID"],
            'X-Naver-Client-Secret': process.env["NAVER_CLIENT_SECRET"],
            withCredentials: true
        }
    };

    const {data} = await axios.get(api_url, options);
    // 기존의 링크와 신규 링크를 비교해서 새로운 링크만 저장
    const uniqueLinks = Array.from(new Set(data.items));

    const diffLinks = uniqueLinks.filter((item: SearchNews) => !oldLinks.includes(item.link));
    const newLinks = Array.from(diffLinks).map((news: SearchNews) => news?.link) || [];
    const redis = await getRedis();
    let tempLinks = oldLinks;
    const listCnt = oldLinks.length + newLinks.length;

    if (listCnt > MAX_LINK) {
        tempLinks.splice(-(listCnt - MAX_LINK));
    }
    // console.log(`total : ${listCnt}`)
    // console.log(`newLinks : ${newLinks.length}`)
    // console.log(`tempLinks : ${tempLinks.length}`)
    const redisData = {[`${query}`]: JSON.stringify([...newLinks, ...tempLinks])};
    await hmsetRedis(redis, RKEYWORD, redisData, 0);

    return data.items.filter(news => news.link && news.link.includes("http") && !oldLinks.includes(news.link));
}

export async function getNews(query: string, start: number): Promise<NewsItem[]> {

    let api_url = `${NAVER_API_URL}?query=${encodeURI(query)}&start=${start}&display=100`; // JSON 결과
    let options = {
        headers: {
            'X-Naver-Client-Id': process.env["NAVER_CLIENT_ID"],
            'X-Naver-Client-Secret': process.env["NAVER_CLIENT_SECRET"],
            withCredentials: true
        }
    };
    const {data} = await axios.get(api_url, options);
    // const result = data.items.map(item => item.title ? {...item, "title": `${item.title}_${start}`} : '')
    return data.items.filter(news => news.link && news.link.includes("http") /*&& news.link.includes("naver")*/);
}


export async function getNewLinks(query: string, start: number, oldLinks: string[] = []): Promise<NewsItem[]> {

    // 새로운 메시지가 있으면 링크 전송
    const newLinks = await getFindNewLinks(query, start, oldLinks || []);
    /*console.log(`====================================old url (${oldLinks.length})=================================================`)
    console.log(oldLinks)
    console.log(newLinks)
    console.log(`====================================new url(${newLinks.length})=================================================`)
    console.log(Array.from(newLinks).map((news: SearchNews) => news?.link))*/

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

async function getPageNewLinks(query: string, oldLinks: string[] = []) {

    const url = `https://search.naver.com/search.naver?where=news&query=${query}`;

    // html 문서 받아서 파싱(parsing)
    const {data} = await axios.get(url);
    const $ = cheerio.load(data);

    // 해당 페이지의 뉴스기사 링크가 포함된 html 요소 추출
    const newsTitles = $("a.news_tit");

    // 요소에서 링크만 추출해서 리스트로 저장
    const newLinks = Array.from(newsTitles).map((title) => $(title).attr("href"));

    // 기존의 링크와 신규 링크를 비교해서 새로운 링크만 저장
    const uniqueLinks = Array.from(new Set(newLinks));

    return uniqueLinks.filter((link) => !oldLinks.includes(link));
}

/*async function getBrowserHtml(query: string, news: News) {

    const url = `https://search.naver.com/search.naver?where=news&query=${query}`;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(news.link);
    const html = await page.evaluate(() => document.documentElement.outerHTML);

    return html;
}*/

function test() {

    // 검색할 키워드 설정
    const queries = ["티디아이", "정치"];

    for (const query of queries) {

        // 기존에 보냈던 링크를 담아둘 리스트 만들기
        const old_links: string[] = [];

        // 주기적 실행과 관련된 코드 (hours는 시, minutes는 분, seconds는 초)
        const job = cron.schedule('*/10 * * * * *', () => {
            getFindNewLinks(query, 1).then();
        });
    }
}
