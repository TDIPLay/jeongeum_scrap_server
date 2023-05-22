import {FastifyReply} from "fastify"
import {handleServerError} from "../helpers/errors"
import service from '../../service/common_service'
import Common_service from '../../service/common_service'
import {BlogItem, CafeItem, IAnyRequest, News, SearchNews} from "../interfaces";
//import rp from 'request-promise-native'
import {getArticle, getFindNewLinks, getNaverRankNews, getNaverRealNews, getNewLinks, getNews, getReply} from "./news";
import {generateChatMessage} from "./openai";
import moment from "moment/moment";
import {closeBrowser, getDateString, sleep, utils} from "../helpers/utils";
import {getRedis} from "../../service/redis";
import {hgetData, hmsetRedis} from "./worker";
import {MAX_LINK, R_BlOG_KEYWORD, R_CAFE_KEYWORD, RKEYWORD, RREPLY_KEYWORD, RSTOCK, RTOTEN} from "../helpers/common";
import {ERROR400, ERROR403, MESSAGE, STANDARD} from "../helpers/constants";
import {getKakaoUserInfo, userKakaoOAuth, validateKakaoToken} from "./kakaoauth";
import {sendMail} from "./mailer";
import {v4 as uuid_v4} from "uuid";
import {createUser, getAlarmsUser} from "./user";
import {getGoogleUserInfo, loginWithGoogle, userGoogleOAuth, validateGoogleToken} from "./googleauth";
import {getNaverUserInfo, userNaverOAuth, validateNaverToken} from "./naverauth";
import {generateTalkTemplate} from "./aligoxkakao";
import {getRelKeyword} from "./naverdatalab";
import {getStockBoard, getStockPage, getStockReply} from "./stock";
import * as puppeteer from "puppeteer";
import {getBlog, getBlogLinks, getFindBlogLinks} from "./naverblog";
import {getCafe, getFindCafeLinks, getNewCafeLinks} from "./navercafe";
import {promisify} from "util";
import mysql from "../../service/mysql";
//import { KoalaNLP } from 'koalanlp';
//import {analyzeSentiment} from "./koanlp";
export const preKoaNap = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        /*      const text = '최근 도서 지역에서 양귀비를 몰래 재배한 사례가 잇따라 발생하고 있다. 25일 경찰 등에 따르면 전날 제주 서귀포시 서호동 소재 귤밭에서 양귀비 100여주가 재배됐다는 신고가 들어와 경찰이 소유주 수사에 나섰다.';
              const sentiment = await analyzeSentiment(text);
              console.log(sentiment);*/

        request.transfer = {
            result: MESSAGE.SUCCESS,
            code: STANDARD.SUCCESS,
            message: "SUCCESS",
            data: {}
        };
        done();

    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}
export const preStock = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {page, query} = request.query;

        const stock = await getStockBoard(page, query);

        const CHUNK_SIZE = 10;
        const browser = await puppeteer.launch({args: ['--no-sandbox']});
        //const browser = await puppeteer.launch({args: ['--no-sandbox'], headless: false});
        for (let i = 0; i < stock.board.length; i += CHUNK_SIZE) {
            const articlePromises = stock.board.slice(i, i + CHUNK_SIZE).map(stock => getStockReply(stock, browser));
            await Promise.all(articlePromises);
            await sleep(20);
        }
        await closeBrowser(browser);


        request.transfer = {
            result: MESSAGE.SUCCESS,
            code: STANDARD.SUCCESS,
            message: "SUCCESS",
            data: stock
        };
        done();

    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}

export const preStockRaw = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {page, query, date} = request.query;
        let stock = null;
        let endDate = date;

        if(!date || date === ''){
            endDate = moment().subtract(2, 'day').format('YYYYMMDD');
        }

        if(query && query === ''){
            //single
            await getStockPage(page, query,``,endDate);
        }else{
            // multiple
            let articlePromises: Promise<void>[] = [];
            const redis = await getRedis();
            const hscan = promisify(redis.hscan).bind(redis);
            const totalStock  = 2590;
            const defPage = page || 100;
            let flag = true;
            let i  = 1;

            const scanAll = async (pattern) => {
                let rediskey = '';
                let cursor = '0';
                do {
                    const reply = await hscan(RSTOCK, cursor, "COUNT", defPage)
                    cursor = reply[0];
                    articlePromises = [];
                    for (const key in reply[1]) {
                        if (reply[1].hasOwnProperty(key)) {
                            if (parseInt(key) % 2 == 0) {
                                rediskey = reply[1][key];
                            } else {
                                try {
                                    if (flag) {
                                        articlePromises.push(getStockPage(page, rediskey, reply[1][key], endDate));
                                    }
                                } catch (e) {
                                    console.log(e)
                                }
                            }
                        }
                    }
                    await Promise.all(articlePromises);
                    console.log(`cursor/page/total/cnt => ${cursor}/${defPage}/${totalStock/parseInt(defPage)}/${i++}`)
                    await sleep(1000);
                } while (cursor !== '0');
            }
            await scanAll('');
        }


        request.transfer = {
            result: MESSAGE.SUCCESS,
            code: STANDARD.SUCCESS,
            message: "SUCCESS",
            data: stock
        };
        done();

    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}


export const preReply = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {query} = request.query;
        const redis = await getRedis();
        const oldLinks = await hgetData(redis, RREPLY_KEYWORD, "json", query) || [];
        const sortBySimNews = await getNews(query, 1, 25, 'sim');
        const sortByDateNews = await getNews(query, 1, 25);
        const blog = /*await getBlog(query,1,10)*/[];
        const neverNews = [...sortBySimNews, ...sortByDateNews, ...blog].filter(news => news.link && news.link.includes("naver.com"))
        let uniqueNeverNews = neverNews.filter((news, index, self) =>
            index === self.findIndex(t => t.link === news.link)
        );
        uniqueNeverNews = uniqueNeverNews.filter(news => !oldLinks.includes(news.link));

        // process.setMaxListeners(18);
        //브라우져 메모리/ 브라우징 이슈로 인해 10개 미만으로
        const CHUNK_SIZE = 10;
        const browser = await puppeteer.launch({args: ['--no-sandbox']});

        for (let i = 0; i < uniqueNeverNews.length; i += CHUNK_SIZE) {
            const articlePromises = uniqueNeverNews.slice(i, i + CHUNK_SIZE).map(news => getReply(news, 'News', browser));
            await Promise.all(articlePromises);
            await sleep(20);
        }
        await closeBrowser(browser);

        const replyList = neverNews
            .filter(news => news.reply && news.reply !== undefined)
        //.flatMap(news => news.reply);
        const sortedNews = replyList.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
        const diffLinks = sortedNews.filter((item: News) => oldLinks && !oldLinks.includes(item.link));
        const newLinks = Array.from(diffLinks).map((news: SearchNews) => news?.link) || [];

        const listCnt = oldLinks?.length + newLinks.length;

        if (listCnt > MAX_LINK) {
            oldLinks.splice(-(listCnt - MAX_LINK));
        }

        const redisData = {[`${query}`]: JSON.stringify([...newLinks, ...oldLinks])};
        await hmsetRedis(redis, RREPLY_KEYWORD, redisData, 0);

        request.transfer = {
            result: MESSAGE.SUCCESS,
            code: STANDARD.SUCCESS,
            message: "SUCCESS",
            data: sortedNews
        };
        done();

    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}

export const preApiRankNews = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        const news = await getNaverRankNews();

        request.transfer = {
            result: MESSAGE.SUCCESS,
            code: STANDARD.SUCCESS,
            message: "SUCCESS",
            list_count: news.length,
            data: news
        };
        done();

    } catch (e) {
        handleServerError(reply, e)
    }
}

export const preApiDataLab = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {query, startDate, endDate} = request.query;
        let date = [];
        if ((typeof query) === 'object') {
            for (let i = 0; i < query.length; i++) {
                date.push(await getRelKeyword(query[i], startDate, endDate))
            }
        } else {
            date.push(await getRelKeyword(query, startDate, endDate))
        }
        //const data = await getRelKeyword(query, startDate, endDate);

        request.transfer = {
            result: MESSAGE.SUCCESS,
            code: STANDARD.SUCCESS,
            message: "SUCCESS",
            data: date
        };
        done();

    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}
export const preApiRealNews = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        const news = await getNaverRealNews();

        request.transfer = {
            result: MESSAGE.SUCCESS,
            code: STANDARD.SUCCESS,
            message: "SUCCESS",
            list_count: news.length,
            data: news
        };
        done();

    } catch (e) {
        handleServerError(reply, e)
    }
}

export const preSearchNews = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {query, page = 1} = request.query;

        const articlePromises: Promise<void>[] = [];

        //1 1-100 2 101-200 3 201-300     10 901-1000
        const start = (page - 1) * 100 + 1;
        const end = page * 100;
        let news: News[] = [];
        const redis = await getRedis();

        if (parseInt(page) <= 10) {
            //page seq 대한기사  100건만
            for (let i = start; i < end; i += 100) {
                let data = null;

                if (i === 1) {
                    let oldLinks = await hgetData(redis, RKEYWORD, "json", query);
                    data = await getFindNewLinks(query, i, oldLinks || []);
                    if (!data || !data.length || data.length < 50) {
                        data = await getNews(query, i, 100);
                    }
                } else {
                    data = await getNews(query, i, 100);
                }
                if (!data || !data.length) break;
                await sleep(100);
                news = [...news, ...data];
            }
            // const  test = await getBrowserHtml(query,'https://n.news.naver.com/mnews/article/003/0011836031?sid=101')
            // console.log(test)
            news.filter(news => news.link && news.link.includes("http"))
                .forEach(news => articlePromises.push(getArticle(news)));
            await Promise.all(articlePromises);

            request.transfer = {
                result: MESSAGE.SUCCESS,
                code: STANDARD.SUCCESS,
                message: "SUCCESS",
                list_count: news.length,
                data: news
            };
        } else {
            request.transfer = {result: MESSAGE.FAIL, code: ERROR400.statusCode, message: "Over Page"};
        }
        done();
    } catch (e) {
        console.error(e)
        handleServerError(reply, e)
    }
}

export const preSearchNewLink = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {query, start} = request.query;
        const articlePromises: Promise<void>[] = [];
        const redis = await getRedis();
        let oldLinks = await hgetData(redis, RKEYWORD, "json", query);

        let news: News[] = [];

        //최근기사 100건만
        for (let i = 1; i < 100; i += 100) {
            let newList = await getNewLinks(query, start, oldLinks || []);
            if (!newList || !newList.length) break;
            let tm = moment(newList[newList.length - 1].pubDate).unix();
            news = [...news, ...newList];

            await sleep(100);
            if (utils.getTime() > tm) break;
        }

        const uniqueNews = Array.from(new Set(news.filter(n => n.link?.startsWith("http"))));
        const sortedNews = uniqueNews.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
        //  const naverNews = Array.from(new Set(news.filter(n => n.link?.includes("naver"))));

        sortedNews.forEach(news => articlePromises.push(getArticle(news)));
        await Promise.all(articlePromises);

        if (sortedNews.length > 0) {
            const {alarmEmailUser, alarmTalkUser} = getAlarmsUser(query, Common_service.alarm_info);

            if (alarmEmailUser.length > 0) {
                console.log(`send mail User :  ${alarmEmailUser}`)
                await sendMail(alarmEmailUser.join(','), sortedNews, query);
            }

            if (alarmTalkUser.length > 0) {
                console.log(`send talk User :  ${alarmTalkUser}`)
                // senderkey: 발신프로필 키
                // tpl_code: 템플릿 코드
                // sender: 발신자 연락처
                // receiver_1: 수신자 연락처
                // subject_1: 알림톡 제목
                // message_1: 알림톡 내용
                let talkUser = {
                    senderkey: 3,
                    tpl_code: 2,
                    sender: alarmTalkUser.join(','),
                }
                const template = generateTalkTemplate(news);
                for (let i = 0; i < alarmTalkUser.length; i++) {
                    talkUser[`receiver_${i + 1}`] = alarmTalkUser[i]
                    talkUser[`subject_${i + 1}`] = `[정음]오늘의 뉴스(#${query})`
                    talkUser[`message_${i + 1}`] = template;
                }
                console.log(talkUser)
                //await alimtalkSend(talkUser, news);
            }
        }


        /*let user: KakaoAccessTokenResponse = await hgetData(redis, RTOTEN_KAKAO, "ygkwang");
        for (let i = 0; i < news.length; i += 4) {
            if(i === 4) break;
            let talk = {
                object_type: 'text',
                text: news[i].title,
                link: {
                    web_url: `${process.env.LINK_PASS_URL}?url=${news[i].originallink}`,
                    mobile_web_url: `${process.env.LINK_PASS_URL}?url=${news[i].originallink}`,
                },
                button_title: "바로 확인"
            };
            console.log(talk)
            await sleep(10);
            sendKakaoTalkMessage(user.access_token, talk)
        }*/


        request.transfer = {
            result: MESSAGE.SUCCESS,
            code: STANDARD.SUCCESS,
            message: "SUCCESS",
            list_count: news.length,
            data: sortedNews
        };
        done();
    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}

export const preSearchBlog = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {query, page = 1} = request.query;

        const articlePromises: Promise<void>[] = [];

        //1 1-100 2 101-200 3 201-300     10 901-1000
        const start = (page - 1) * 100 + 1;
        const end = page * 100;
        let blog: BlogItem[] = [];
        const redis = await getRedis();

        if (parseInt(page) <= 10) {
            //page seq 대한기사  100건만
            for (let i = start; i < end; i += 100) {
                let data = null;

                if (i === 1) {
                    let oldLinks = await hgetData(redis, R_BlOG_KEYWORD, "json", query);
                    data = await getFindBlogLinks(query, i, oldLinks || []);
                    if (!data || !data.length || data.length < 50) {
                        data = await getBlog(query, i, 100);
                    }
                } else {
                    data = await getNews(query, i, 100);
                }
                if (!data || !data.length) break;
                await sleep(100);
                blog = [...blog, ...data];
            }
            // blog.filter(blog => blog.link && blog.link.includes("http"))
            //     .forEach(blog => articlePromises.push(getArticle(blog)));
            // await Promise.all(articlePromises);
            const blogData = blog.map(blog => {
                return {
                    ...blog,
                    timestamp: moment(blog.postdate).unix(),
                    pub_date: getDateString(moment(blog.postdate).unix(), 'unit')

                }
            })
            request.transfer = {
                result: MESSAGE.SUCCESS,
                code: STANDARD.SUCCESS,
                message: "SUCCESS",
                list_count: blogData.length,
                data: blogData
            };
        } else {
            request.transfer = {result: MESSAGE.FAIL, code: ERROR400.statusCode, message: "Over Page"};
        }
        done();
    } catch (e) {
        console.error(e)
        handleServerError(reply, e)
    }
}

export const preSearchBlogNewLink = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {query, start} = request.query;
        const articlePromises: Promise<void>[] = [];
        const redis = await getRedis();
        let oldLinks = await hgetData(redis, R_BlOG_KEYWORD, "json", query);

        let blog: BlogItem[] = [];

        //최근기사 100건만
        for (let i = 1; i < 100; i += 100) {
            let blogList = await getBlogLinks(query, start, oldLinks || []);
            if (!blogList || !blogList.length) break;
            let tm = moment(blogList[blogList.length - 1].postdate).unix();
            blog = [...blog, ...blogList];

            await sleep(100);
            if (utils.getTime() > tm) break;
        }

        const uniqueNews = Array.from(new Set(blog.filter(n => n.link?.startsWith("http"))));
        const blogData = uniqueNews.map(blog => {
            return {
                ...blog,
                timestamp: moment(blog.postdate).unix(),
                pub_date: getDateString(moment(blog.postdate).unix(), 'unit')

            }
        })
        const sortedBlog = blogData.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);

        // sortedBlog.forEach(news => articlePromises.push(getArticle(news)));
        // await Promise.all(articlePromises);

        request.transfer = {
            result: MESSAGE.SUCCESS,
            code: STANDARD.SUCCESS,
            message: "SUCCESS",
            list_count: blog.length,
            data: sortedBlog
        };
        done();
    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}
export const preSearchCafe = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {query, page = 1} = request.query;

        const articlePromises: Promise<void>[] = [];

        //1 1-100 2 101-200 3 201-300     10 901-1000
        const start = (page - 1) * 100 + 1;
        const end = page * 100;
        let cafe: CafeItem[] = [];
        const redis = await getRedis();

        if (parseInt(page) <= 10) {
            //page seq 대한기사  100건만
            for (let i = start; i < end; i += 100) {
                let data = null;

                if (i === 1) {
                    let oldLinks = await hgetData(redis, R_CAFE_KEYWORD, "json", query);
                    data = await getFindCafeLinks(query, i, oldLinks || []);
                    if (!data || !data.length || data.length < 50) {
                        data = await getCafe(query, i, 100);
                    }
                } else {
                    data = await getCafe(query, i, 100);
                }
                if (!data || !data.length) break;
                await sleep(100);
                cafe = [...cafe, ...data];
            }
            // const  test = await getBrowserHtml(query,'https://n.news.naver.com/mnews/article/003/0011836031?sid=101')
            // console.log(test)
            /*cafe.filter(news => news.link && news.link.includes("http"))
                .forEach(news => articlePromises.push(getArticle(news)));
            await Promise.all(articlePromises);*/
            const cafeData = cafe.map(cafe => {
                return {
                    ...cafe,
                    timestamp: moment().unix(),
                    pub_date: getDateString(moment().unix(), 'unit')

                }
            })
            request.transfer = {
                result: MESSAGE.SUCCESS,
                code: STANDARD.SUCCESS,
                message: "SUCCESS",
                list_count: cafeData.length,
                data: cafeData
            };
        } else {
            request.transfer = {result: MESSAGE.FAIL, code: ERROR400.statusCode, message: "Over Page"};
        }
        done();
    } catch (e) {
        console.error(e)
        handleServerError(reply, e)
    }
}

export const preSearchCafeNewLink = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {query, start} = request.query;
        const articlePromises: Promise<void>[] = [];
        const redis = await getRedis();
        let oldLinks = await hgetData(redis, R_CAFE_KEYWORD, "json", query);

        let cafe: CafeItem[] = [];

        //최근기사 100건만
        for (let i = 1; i < 100; i += 100) {
            let cafeList = await getNewCafeLinks(query, start, oldLinks || []);
            if (!cafeList || !cafeList.length) break;
            let tm = moment(cafeList[cafeList.length - 1].pubDate).unix();
            cafe = [...cafe, ...cafeList];

            await sleep(100);
            if (utils.getTime() > tm) break;
        }

        const uniqueNews = Array.from(new Set(cafe.filter(n => n.link?.startsWith("http"))));
        const cafeData = uniqueNews.map(cafe => {
            return {
                ...cafe,
                timestamp: moment().unix(),
                pub_date: getDateString(moment().unix(), 'unit')

            }
        })
        const sortedCafe = cafeData.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
        //  const naverNews = Array.from(new Set(news.filter(n => n.link?.includes("naver"))));

        /* sortedCafe.forEach(news => articlePromises.push(getArticle(news)));
         await Promise.all(articlePromises);*/

        request.transfer = {
            result: MESSAGE.SUCCESS,
            code: STANDARD.SUCCESS,
            message: "SUCCESS",
            list_count: cafeData.length,
            data: cafeData
        };
        done();
    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}


export const preOpenAi = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        const {query} = request.query;
        const response = await generateChatMessage(query)

        request.transfer = response !== null ? {result: "Success", massage: response} : {
            result: "Fail",
            massage: "기사를 작성 할 수 없습니다."
        };
        done();
    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}

//콜백시 sns로그인 페이지로 id 전달
export const preSocialCallback = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {code, state} = request.query
        const {social} = request.params
        let token, user;

        switch (social) {
            case 'kakao' :
                token = await userKakaoOAuth(code);
                if (token.access_token) {
                    user = await getKakaoUserInfo(token.access_token);
                }
                break;
            case 'naver' :
                token = await userNaverOAuth(code);
                if (token.access_token) {
                    user = await getNaverUserInfo(token.access_token);
                }
                break;
            case 'google' :
                token = await userGoogleOAuth(code);
                if (token.access_token) {
                    user = await getGoogleUserInfo(token.access_token);
                }
                break;
            default:
                break;
        }
        const {name, email, mobile, image} = user;
        const redisData = {[`${email}`]: JSON.stringify(token)};
        await hmsetRedis(await getRedis(), RTOTEN, redisData, 8650454);

        let userObj = {
            division: 'regist',
            'email': `${email}`,
            'name': name,
            'mobile': mobile ? mobile.replace(/-/g, "") : '',
            'token': token.access_token,
            'type': state,
        }

        const res = await createUser(userObj);

        if (res.data.result) {
            request.transfer = `?id=${email}&type=${social}`;
        } else {
            if (email) {
                userObj.division = "modify"
                console.log("id 중복 modify")
                console.log(userObj)
                const res = await createUser(userObj);
                if (res.data.result) {
                    request.transfer = `?id=${email}&type=${social}`;
                }
            }
        }
        done();
    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}

export const preSocial = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const uuid = `${uuid_v4()}`;
        const {social} = request.params;
        const {id} = request.query;
        //let token = id ? await hgetData(await getRedis(), RTOTEN, id) : null;
        switch (social) {
            case 'kakao' :
                request.transfer = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${process.env.SOCIAL_POSTBACK}/${social}&state=${social}`;
                break;
            case 'naver' :
                request.transfer = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${process.env.NAVER_CLIENT_ID}&redirect_uri=${process.env.SOCIAL_POSTBACK}/${social}&state=${social}`
                break;
            case 'google' :
                const google_auth_url = loginWithGoogle()
                request.transfer = `${google_auth_url}&state=${social}`;
                break;
            default:
                break;
                console.log(request.transfer)
        }
        done();
    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}

export const preSocialLogin = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {sns_type, sns_token} = request.body;
        let checkFlag = false;

        if (sns_token) {
            switch (sns_type) {
                case 'kakao' :
                    checkFlag = await validateKakaoToken(sns_token);
                    break;
                case 'naver' :
                    checkFlag = await validateNaverToken(sns_token);
                    break;
                case 'google' :
                    checkFlag = await validateGoogleToken(sns_token);
                    break;
                default:
                    break;
            }

            if (checkFlag) {
                request.transfer = request.transfer = {
                    result: MESSAGE.SUCCESS,
                    code: STANDARD.SUCCESS,
                    message: "SUCCESS",
                    token_status: true
                };
            } else {
                request.transfer = request.transfer = {
                    result: MESSAGE.FAIL,
                    code: ERROR403.statusCode,
                    message: "FAIL",
                    token_status: false
                };

            }
        }
        done();
    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}
//Stock html
export const preStockUp = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        const {page, query, startDate, endDate} = request.query;
        const sDate = startDate ? ` and date >= '${startDate}'` : '';
        const eDate = endDate ? ` and date <= '${endDate}'` : '';
        const company = query ? ` and company = '${query}'` : '';
        const start = (page - 1) * 500 + 1;
        const end = page * 500;
        // http://127.0.0.1/tdi/talk/v1/stock_table?query=%EC%82%BC%EC%84%B1%EC%A0%84%EA%B8%B0&startDate=20230422&endDate=20230517&page=1
        let squery = `SELECT *
                      FROM stock_information2
                      WHERE 1 ${sDate}${eDate}${company}
                      ORDER BY DATE DESC LIMIT ${start}, ${end}`
        const stock = await mysql.getInstance().query(squery);
        const html = `
     <html>
  <head>
    <style>
      table {
        border-collapse: collapse;
        font-size: 12px;
      }
      th, td {
        border: 1px solid black;
        padding: 8px;
        text-align: right;
      }
      th {
        background-color: lightgray;
      }
      .negative {
        color: red;
      }
      .positive {
        color: blue;
      }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <th>번호</th>
        <th>날짜</th>
        <th>회사</th>
        <th>뉴스 수</th>
        <th>공시 수</th>
        <th>토론글 수</th>
        <th>조회 수</th>
        <th>공감</th>
        <th>비공감</th>
        <th>ID 중복 비율</th>
        <th>종가</th>
        <th>주가 변동률</th>
        <th>거래량</th>
        <th>거래금액</th>
        <th>기관 투자자</th>
        <th>외국인 투자자</th>
        <th>KOSDAQ KOSPI</th>
      </tr>
      ${stock.map((row) => `
        <tr>
          <td>${row.no}</td>
          <td>${row.date.split('T')[0]}</td>
          <td>${row.company}</td>
          <td>${row.news_count.toLocaleString()}</td>
          <td>${row.disclosure_count.toLocaleString()}</td>
          <td>${row.post_count.toLocaleString()}</td>
          <td>${row.views.toLocaleString()}</td>
          <td>${row.sympathy.toLocaleString()}</td>
          <td>${row.non_sympathy.toLocaleString()}</td>
          <td>${row.id_duplicate_ratio}</td>
          <td class="${row.closing_price < 0 ? 'negative' : 'positive'}">${row.closing_price.toLocaleString()}</td>
          <td class="${row.stock_price_change_rate < 0 ? 'negative' : 'positive'}">${row.stock_price_change_rate.toLocaleString()}</td>
          <td>${row.trading_volume.toLocaleString()}</td>
          <td>${row.trading_value.toLocaleString()}</td>
           <td class="${row.institutional_investors < 0 ? 'negative' : 'positive'}">${row.institutional_investors.toLocaleString()}</td>
          <td class="${row.foreign_investors < 0 ? 'negative' : 'positive'}">${row.foreign_investors.toLocaleString()}</td>
          <td>${row.kosdaq_kospi}</td>
        </tr>
      `).join('')}
    </table>
  </body>
</html>
    `;
        request.transfer = html

        done();
    } catch (e) {
        handleServerError(reply, e)
    }
}
//서버 시스템 동기화
export const preApiSyncUp = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        // const options = {method: 'GET'};
        // const requests = service.server_info.map((value) => {
        //     const url = `http://${value.ip}/tdi/v1/set_sync`;
        //     return rp(url, options).catch(() => 'err');
        // });
        //
        // const results = await Promise.all(requests);
        // service.err_cnt += results.filter((res) => res === 'err').length;

        request.transfer = {'err': service.err_cnt}

        done();
    } catch (e) {
        handleServerError(reply, e)
    }
}



