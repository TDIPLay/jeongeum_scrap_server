import {FastifyReply} from "fastify"
import {handleServerError} from "../helpers/errors"
import service from '../../service/common_service'
import {IAnyRequest, News} from "../interfaces";
import rp from 'request-promise'
import {getArticle, getNaverRankNews, getNaverRealNews, getNews, sendLinks} from "./news";
import {generateChatMessage} from "./openai";
import moment from "moment/moment";
import {sleep, utils} from "../helpers/utils";
import {getRedis} from "../../service/redis";
import {hgetData, hmsetRedis} from "./worker";
import {MAX_LINK, RKEYWORD} from "../helpers/common";


export const preApiRankNews = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        const news = await getNaverRankNews();
        request.transfer = news;

        done();
    } catch (e) {
        handleServerError(reply, e)
    }
}
export const preApiRealNews = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        const news = await getNaverRealNews();
        request.transfer = news;

        done();
    } catch (e) {
        handleServerError(reply, e)
    }
}
export const preSearchNews = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {query, start} = request.query;

        const articlePromises: Promise<void>[] = [];

        let news: News[] = [];
        for (let i = 1; i < 100; i += 100) {
            let data = await getNews(query, i);
            await sleep(100);
            let timestamp = moment(data[data.length - 1].pubDate).unix();
            news = [...news, ...data];

            if (utils.getTime() > timestamp) break;
        }

        news.filter(news => news.link && news.link.includes("http"))
            .forEach(news => articlePromises.push(getArticle(news)));
        await Promise.all(articlePromises);
        /*news.filter(news => news.link && news.link.includes("http") && news.link.includes("naver"))
            .forEach(news => articlePromises.push(getArticleDetails(news, AXIOS_OPTIONS, 1)));
        await Promise.all(articlePromises);

       news.filter(news => news.link && news.link.includes("http") && !news.link.includes("naver"))
           .forEach(news => articlePromises.push(getArticleMetaDetails(news, AXIOS_OPTIONS, 1)));
       await Promise.all(articlePromises);*/
        // console.log(moment)

        request.transfer = news;
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
        let oldLinks = await hgetData(redis, "NewAllKeyword", query);

        let news: News[] = [];

        for (let i = 1; i < 100; i += 100) {
            let data = await sendLinks(query, start, oldLinks);
            if(!data) break;
            let timestamp = moment(data[data.length - 1].pubDate).unix();
            news = [...news, ...data];

            await sleep(100);
            if (utils.getTime() > timestamp) break;
        }
        oldLinks  = await hgetData(redis, RKEYWORD, query);

        if(oldLinks && oldLinks.length > MAX_LINK){
            oldLinks.splice(-(oldLinks.length - MAX_LINK));
        }

        const redisData = {[`${query}`]: JSON.stringify(oldLinks)};
        await hmsetRedis(redis, RKEYWORD, redisData, 0);

        news.filter(news => news.link && news.link.includes("http"))
            .forEach(news => articlePromises.push(getArticle(news)));
        await Promise.all(articlePromises);

        request.transfer = news;
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



