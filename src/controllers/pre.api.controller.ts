import {FastifyReply} from "fastify"
import {handleServerError} from "../helpers/errors"
import service from '../../service/common_service'
import {IAnyRequest, News} from "../interfaces";
import rp from 'request-promise'
import {getArticle, getNaverRankNews, getNaverRealNews, getNewLinks, getNews, sendLinks} from "./news";
import {generateChatMessage} from "./openai";
import moment from "moment/moment";
import {sleep, utils} from "../helpers/utils";
import {getRedis} from "../../service/redis";
import {hgetData, hmsetRedis} from "./worker";
import {MAX_LINK, RKEYWORD} from "../helpers/common";
import {MESSAGE} from "../helpers/constants";


export const preApiRankNews = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        const news = await getNaverRankNews();

        request.transfer = {result: MESSAGE.SUCCESS, code: 0, message: "SUCCESS", list_count: news.length, data: news};

        done();
    } catch (e) {
        handleServerError(reply, e)
    }
}
export const preApiRealNews = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        const news = await getNaverRealNews();

        request.transfer = {result: MESSAGE.SUCCESS, code: 0, message: "SUCCESS", list_count: news.length, data: news};

        done();
    } catch (e) {
        handleServerError(reply, e)
    }
}
export const preSearchNews = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {query, page = 1} = request.query;

        const articlePromises: Promise<void>[] = [];
        //1 1-100 2 101-200 3 201-300     10 900
        const start = (page - 1) * 100 + 1;
        const end = page * 100;
        let news: News[] = [];
        const redis = await getRedis();

        if (parseInt(page) <= 10) {

            for (let i = start; i < end; i += 100) {
                let data = null;

                if(i == 1){
                    let oldLinks = await hgetData(redis, RKEYWORD, query);
                    data = await getNewLinks(query, i, oldLinks);
                    if (!data || !data.length){
                        data = await getNews(query, i);
                    }
                }else{
                    data = await getNews(query, i);
                }
                if (!data || !data.length) break;
                await sleep(100);
                news = [...news, ...data];

                if (utils.getTime() > moment(data[data.length - 1].pubDate).unix()) break;
            }

            news.filter(news => news.link && news.link.includes("http"))
                .forEach(news => articlePromises.push(getArticle(news)));
            await Promise.all(articlePromises);

            request.transfer = {
                result: MESSAGE.SUCCESS,
                code: 0,
                message: "SUCCESS",
                list_count: news.length,
                data: news
            };
        } else {
            request.transfer = {result: MESSAGE.FAIL, code: 400, message: "Over Page"};
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

        for (let i = 1; i < 100; i += 100) {
            let data = await sendLinks(query, start, oldLinks);
            if (!data || !data.length) break;
            let timestamp = moment(data[data.length - 1].pubDate).unix();
            news = [...news, ...data];

            await sleep(100);
            if (utils.getTime() > timestamp) break;
        }
        oldLinks = await hgetData(redis, RKEYWORD, query);

        if (oldLinks && oldLinks.length > MAX_LINK) {
            oldLinks.splice(-(oldLinks.length - MAX_LINK));
        }

        const redisData = {[`${query}`]: JSON.stringify(oldLinks)};
        await hmsetRedis(redis, RKEYWORD, redisData, 0);

        news.filter(news => news.link && news.link.includes("http"))
            .forEach(news => articlePromises.push(getArticle(news)));
        await Promise.all(articlePromises);

        request.transfer = request.transfer = {
            result: MESSAGE.SUCCESS,
            code: 0,
            message: "SUCCESS",
            list_count: news.length,
            data: news
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

//서버 시스템 동기화
export const preApiSyncUp = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        const options = {method: 'GET'};
        const requests = service.server_info.map((value) => {
            const url = `http://${value.ip}/tdi/v1/set_sync`;
            return rp(url, options).catch(() => 'err');
        });

        const results = await Promise.all(requests);
        service.err_cnt += results.filter((res) => res === 'err').length;

        request.transfer = {'err': service.err_cnt}

        done();
    } catch (e) {
        handleServerError(reply, e)
    }
}



