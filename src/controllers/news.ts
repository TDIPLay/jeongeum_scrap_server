import axios from 'axios';
import axiosRetry from 'axios-retry';
import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import {News, NewsItem, Scraper, SearchNews} from "../interfaces";
import cron from 'node-cron';
import moment from 'moment'
import {MAX_LINK, NAVER_API_URL, NAVER_RANK_URL, RKEYWORD, RSEARCHAPI} from "../helpers/common";
import {closeBrowser, decodeHtmlEntities, extractAuthorAndEmail, getDateString} from "../helpers/utils";
import {getRedis} from "../../service/redis";
import {getRedisPress, hmsetRedis, setRedisPress} from "./worker";
import {ResponseType} from "axios";
import request from "request";
import {getApiClientKey} from "./engine";

const REQUEST_OPTIONS = {
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36",
    },
    encoding: null,
    timeout: 7000,
    followRedirect: true,
    maxRedirects: 3,
};


const AXIOS_OPTIONS = {
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36",
    },
    encoding: null,
    method: "GET",
    timeout: 5000,
    maxRedirects: 3,
    onRedirect: (redirectRequest, redirectResponse) => {
        console.log(`Redirected to: ${redirectResponse.headers.location}`);
    },
    responseType: "arraybuffer" as ResponseType,
};

const noTypePress = ['finomy.com', 'ikunkang.com', 'www.rapportian.com']

async function axiosCall2(link: string): Promise<cheerio.CheerioAPI> {

    try {
        axiosRetry(axios, {
            retries: 2,
            retryDelay: (retryCount) => {
                return retryCount * 1000; // 1초, 2초, 3초
            },
            shouldResetTimeout: true,
        });

        let response = await axios.get(link, AXIOS_OPTIONS);

        const content_type = response.headers['content-type'].match(/charset=(.+)/i);
        const no_type = noTypePress.some(x => link.includes(x))
        const encoding = content_type && content_type.length ? content_type[1] : no_type ? "euc-kr" : "utf-8";

        const data = encoding.toLowerCase() !== 'utf-8' ? iconv.decode(response.data, encoding) : response.data;

        return cheerio.load(data);

    } catch (error) {
        console.error(`Error axiosCall link: ${error.message} => ${link}`);
        return null;
    }
}


async function requestCall(link: string): Promise<any> {
    try {
        return await new Promise<any>((resolve, reject) => {
            request.get(link, REQUEST_OPTIONS, (err, res) => {
                if (err) {
                    return reject(err);
                }
                resolve(res);
            });
        });
    } catch (error) {
        console.error(`Error requestCall link: ${error.message} => ${link}`);
        return null;
    }
}

async function newsCall(link: string): Promise<cheerio.CheerioAPI> {
    try {
        let response = await requestCall(link)
        const content_type = response.headers["content-type"].match(/charset=([\w-]+)/i);
        const no_type = noTypePress.some((x) => link.includes(x));
        const encoding = content_type && content_type.length ? content_type[1] : no_type ? "euc-kr" : "utf-8";

        const data = encoding.toLowerCase() !== "utf-8" ? iconv.decode(response.body, encoding) : response.body.toString();

        return cheerio.load(data);
    } catch (error) {
        console.error(`Error requestCall link: ${error.message} => ${link}`);
        return null;
    }
}

async function getArticleDetails(news: News): Promise<void> {

    try {

        const $ = await newsCall(news.link);
        if ($ === null) return null;

        const main = $('div.media_end_head_info.nv_notrans');
        let author = $('.byline_s').first().text().trim() || $('.byline_p').first().text().trim() || $('.byline').first().text().trim()

        const result = extractAuthorAndEmail(author);
        const name = result.map(x => x.name)
        const email = result.map(x => x.email)
        // const content = $('body').find('p').text().trim();
        // const content = $('#dic_area').first().text().replace(/\s/g, ' ').trim();
        const description = news.description || `${$('meta[property^="og:description"]')?.attr('content')}...`
        const prePress = $('meta[name^="twitter:creator"]')?.attr('content') || $('meta[property^="og:article:author"]')?.attr('content');
        const {domain, press} = await getRedisPress(news);
        let company = press || news.company || prePress
        const thumbnail = $('meta[property^="twitter:image"], meta[property^="og:image"]')?.first().attr('content') || '';
        const originallink = news.originallink || $(main).find('a').attr('href');


        if (news.title) news.title = decodeHtmlEntities(news.title);
        if (originallink) news.originallink = originallink;
        if (thumbnail) news.thumbnail = thumbnail;
        if (company) news.company = company.includes("|") ? company.split("|")[1].trim() : company.trim();
        if (description) news.description = decodeHtmlEntities(description);
        if (author) news.author = author;
        if (name) news.name = JSON.stringify(name);
        if (email) news.email = JSON.stringify(email);

        if (!press) await setRedisPress(domain, news.company);
        if (news.pubDate) {
            news.timestamp = moment(news.pubDate).unix();
            news.pubDate = getDateString(news.timestamp, 'unit');
        } else {
            const date = $(main).find("._ARTICLE_DATE_TIME").attr('data-date-time')
            news.pubDate = getDateString(new Date(date).getTime(), 'default');
            news.timestamp = new Date(date).getTime() / 1000;
        }

    } catch (error) {
        console.log(error)
        console.error(`Error fetching getArticleDetails: ${error.message} => ${news.title}`);
    }
}

async function fetchMetadata(url: string): Promise<any> {
    try {

        const $ = await newsCall(url);
        if ($ === null) return null;

        const metadata: any = {};
        //const patten = "/\\s/g";
        // metadata.body = $('body').find('p').text().trim();
        $('meta').each((i, el) => {
            const name = $(el).attr('name');
            const property = $(el).attr('property');
            const content = $(el).attr('content');

            if (content && (name || property)) {
                const key = name ? name.split(':').pop() : property.split(':').pop();
                metadata[key.toLowerCase()] = content;
            }
        });
        const emailLink = $("a[href^='mailto:']");

        if (emailLink.length > 0) {
            metadata['email'] = [emailLink.attr("href").replace("mailto:", "")];
            // const nameElement = emailLink.clone().children().remove().end();
            // console.log(nameElement.html())
            // const name = nameElement.text().trim() || '';
            // const email = emailLink.attr('href')?.replace('mailto:', '') || '';
        }
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

//기사 원문 스크랩
async function getArticleMetaDetails(news: News): Promise<void> {
    try {
        const data = await fetchMetadata(news.link);

        if (data) {
            news.thumbnail = data.image || '';
            news.author = data.author || '';
            news.content = data.body || '';
            const ext = extractAuthorAndEmail(news.author);
            news.name = JSON.stringify(ext.map(x => x.name)) || '';
            news.email = JSON.stringify(data.email);
            const {domain, press} = await getRedisPress(news);
            news.company = press || (data.site_name || data.copyright)
            news.title = decodeHtmlEntities(news.title);
            news.description = decodeHtmlEntities(news.description) || '';

            if (!press) await setRedisPress(domain, news.company);

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

//언론사별 기사 랭킹 1~5 rank 스크랩
export async function getNaverRankNews(): Promise<Scraper> {
    try {
        const $ = await newsCall(NAVER_RANK_URL);

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


        return scrap;

    } catch (error) {
        console.error(`Error getNaverRankNews: ${error.message}`);
    }
}


export async function getNaverRealNews(): Promise<Scraper> {
    try {
        const $ = await newsCall(NAVER_RANK_URL);

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
//검색어에 +넣으면 &연산 -넣으면 or연산 다음에 추가
export async function getFindNewLinks(query: string, start: number = 1, oldLinks: string[] = []): Promise<NewsItem[]> {

    const clientInfo = await getApiClientKey(RSEARCHAPI, 1);

    let api_url = `${NAVER_API_URL}?query=${encodeURI(query)}&start=${start}&display=100&`; // JSON 결과
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
    const newLinks = Array.from(diffLinks).map((news: SearchNews) => news?.link) || [];

    let tempLinks = oldLinks;
    const listCnt = oldLinks.length + newLinks.length;

    if (listCnt > MAX_LINK) {
        tempLinks.splice(-(listCnt - MAX_LINK));
    }
    // console.log(`total : ${listCnt}`)
    // console.log(`newLinks : ${newLinks.length}`)
    // console.log(`tempLinks : ${tempLinks.length}`)
    const redisData = {[`${query}`]: JSON.stringify([...newLinks, ...tempLinks])};
    await hmsetRedis(await getRedis(), RKEYWORD, redisData, 0);

    return data.items.filter(news => news.link && news.link.includes("http") && !oldLinks.includes(news.link));
}

export async function getNews(query: string, start: number, display: number = 100, sort: string = 'date'): Promise<NewsItem[]> {
    const clientInfo = await getApiClientKey(RSEARCHAPI, 1);
    let api_url = `${NAVER_API_URL}?query=${encodeURI(query)}&start=${start}&display=${display}&sort=${sort}`; // JSON 결과

    let options = {
        headers: {
            'X-Naver-Client-Id': clientInfo.client_id,
            'X-Naver-Client-Secret': clientInfo.client_secret,
            withCredentials: true
        }
    };
    const {data} = await axios.get(api_url, options);


    // const result = data.items.map(item => item.title ? {...item, "title": `${item.title}_${start}`} : '')
    return data.items.filter(news => news.link && news.link.includes("http") /*&& news.link.includes("naverauth.ts")*/);
}

export async function getBlog(query: string, start: number, display: number = 100, sort: string = 'date'): Promise<NewsItem[]> {
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

    /*  data.items.map(news =>{
        if(news.postdate){
            news.timestamp = moment(news.postdate).unix();
            news.pubDate = getDateString(news.timestamp, 'unit');
        }
    })*/


    // const result = data.items.map(item => item.title ? {...item, "title": `${item.title}_${start}`} : '')
    return data.items.filter(news => news.link && news.link.includes("http") /*&& news.link.includes("naverauth.ts")*/);
}


export async function getNewLinks(query: string, start: number, oldLinks: string[] = []): Promise<NewsItem[]> {

    // 새로운 메시지가 있으면 링크 전송
    const newLinks = await getFindNewLinks(query, start, oldLinks || []);

    /*console.log(`====================================old url (${oldLinks.length})=================================================`)
    console.log(oldLinks)
    console.log(newLinks)
    console.log(`====================================new url(${newLinks.length})=================================================`)
    console.log(Array.from(newLinks).map((news: SearchNews) => news?.link))*/

    /*if (newLinks.length > 0) {
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
    }*/
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

export async function getReply(news: News, type: string = 'News', browser) {


    const page = await browser.newPage();
    let modifiedUrl = news.link.includes('n.news.naver.com/mnews') ? news.link.replace("/article/", "/article/comment/") : news.link;
    try {
        // https://n.news.naver.com/mnews/article/comment/277/0005257002?sid=100
        // https://n.news.naver.com/mnews/article/comment/022/0003810455?sid=104


        await page.goto(modifiedUrl, {waitUntil: 'networkidle0', timeout: 3000});
        //const commentCountEl = await page.$('.media_end_head_info_variety_cmtcount a.media_end_head_cmtcount_button');
        //if(!commentCountEl) return;
        //const commentCountText = await commentCountEl?.evaluate(el => el.textContent.trim());
        //const commentCount = commentCountText ? parseInt(commentCountText) : null
        const commentCountText = await page.$eval('.u_cbox_count', el => el.textContent);
        const commentCount = commentCountText ? parseInt(commentCountText) : null

        if (commentCount > 0) {
            const textContents = await page.evaluate(() => {
                const elements = document.querySelectorAll('.u_cbox_comment_box');
                const result = [];

                elements.forEach((element) => {
                    const contentsEl = element.querySelector('.u_cbox_contents');
                    const sympathyEl = element.querySelector('.u_cbox_cnt_recomm');
                    const non_sympathyEl = element.querySelector('.u_cbox_cnt_unrecomm');
                    const contents = contentsEl ? contentsEl.textContent.trim()/*.replace(/[^\S\r\n]+/g, ' ')*/ : '';
                    const sympathyCount = sympathyEl ? parseInt(sympathyEl.textContent.trim()) : 0;
                    const nonSympathyCount = non_sympathyEl ? parseInt(non_sympathyEl.textContent.trim()) : 0;

                    if(contentsEl || sympathyEl ||non_sympathyEl){
                        result.push({
                            contents: contents,
                            sympathy: sympathyCount,
                            non_sympathy: nonSympathyCount
                        });
                    }
                });

                return result;
            });


            if (type == 'News') {
                try {
                    const likeItElements = await page.evaluate(() => {
                        const elements = document.querySelectorAll('#likeItCountViewDiv li');
                        const likeItCounts = {};
                        elements.forEach((element) => {
                            const name = element.querySelector('span.u_likeit_list_name._label').textContent.trim();
                            const count = parseInt(element.querySelector('span.u_likeit_list_count._count').textContent.trim());
                            likeItCounts[name] = count;
                        });
                        return likeItCounts;
                    });
                    news.like = likeItElements;
                } catch (e) {
                }
            }

            if (textContents && textContents.length > 0) {

                news.reply = textContents;
                if (news.pubDate) {
                    news.timestamp = moment(news.pubDate).unix();
                    news.pubDate = getDateString(news.timestamp, 'unit');
                }
                if (news.postdate) {
                    news.timestamp = moment(news.postdate).unix();
                    news.pubDate = getDateString(news.timestamp, 'unit');
                }
            }
        }

        await page.close();

    } catch (e) {
        console.log(e)
        console.log(modifiedUrl)
        await page.close();
    }
    // return textContents;
}

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
