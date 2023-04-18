import {FastifyReply} from "fastify"
import {handleServerError} from "../helpers/errors"
import service from '../../service/common_service'
import {IAnyRequest, News} from "../interfaces";
//import rp from 'request-promise-native'
import {getArticle, getFindNewLinks, getNaverRankNews, getNaverRealNews, getNewLinks, getNews} from "./news";
import {generateChatMessage} from "./openai";
import moment from "moment/moment";
import {sleep, utils} from "../helpers/utils";
import {getRedis} from "../../service/redis";
import {hgetData, hmsetRedis} from "./worker";
import {RKEYWORD, RTOTEN} from "../helpers/common";
import {ERROR400, ERROR403, MESSAGE, STANDARD} from "../helpers/constants";
import {getKakaoUserInfo, userKakaoOAuth, validateKakaoToken} from "./kakaoauth";
import {EmailSender, generateHTML} from "./mailer";
import {v4 as uuid_v4} from "uuid";
import {createUser} from "./user";
import {getGoogleUserInfo, loginWithGoogle, userGoogleOAuth, validateGoogleToken} from "./googleauth";
import {getNaverUserInfo, userNaverOAuth, validateNaverToken} from "./naverauth";

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
                    let oldLinks = await hgetData(redis, RKEYWORD, query);
                    data = await getFindNewLinks(query, i, oldLinks || []);
                    if (!data || !data.length || data.length < 50) {
                        data = await getNews(query, i);
                    }
                } else {
                    data = await getNews(query, i);
                }
                if (!data || !data.length) break;
                await sleep(100);
                news = [...news, ...data];
            }

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
        let oldLinks = await hgetData(redis, RKEYWORD, query);

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

        sortedNews.forEach(news => articlePromises.push(getArticle(news)));
        await Promise.all(articlePromises);


        /* news.filter(news => news.link && news.link.includes("http"))
             .forEach(news => articlePromises.push(getArticle(news)));
         await Promise.all(articlePromises);

         news.sort((a, b) => b.timestamp - a.timestamp);*/

        if (sortedNews.length > 0) {
            const content = generateHTML(news);
            //console.log(content)
            await new EmailSender({
                user: process.env.GOOGLE_MAIL_ID,
                pass: process.env.GOOGLE_MAIL_PW,
            }).sendEmail({
                from: process.env.GOOGLE_MAIL_ID,
                to: 'ygkwang@nsmg21.com',
                subject: `[정음]오늘의 뉴스(#${query})`,
                html: content,
            });
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
let i = 0;

//콜백시 sns로그인페이지로 id 전달
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
        console.log(`${social}_ACCESS_TOKEN: => ${token.access_token}`)
        console.log(`User ID: ${email}`);
        console.log(`Nickname: ${name}`);
        console.log(`Phone: ${user?.mobile}`);
        console.log(`ProfilImg: ${user?.image}`);

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
        const uuid = `${uuid_v4()}`;
        const {social} = request.params;
        const {id} = request.query;
        const {account_id, sns_type, sns_token} = request.body;

        /* //토큰이 없으면 social 토큰 요청
         let token = null
         if(id){
             token = await hgetData(await getRedis(), RTOTEN, id);
         }*/
        console.log("vendor")
        console.log(account_id)
        console.log(sns_type)
        console.log(sns_token)
        let checkFlag =  false;

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



