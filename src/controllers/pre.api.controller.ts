import {FastifyReply} from "fastify"
import {handleServerError} from "../helpers/errors"
import service from '../../service/common_service'
import {IAnyRequest} from "../interfaces";
import rp from 'request-promise'
import {AXIOS_OPTIONS} from "../helpers/common";
import {getArticleDetails, getNaverNews, getNaverRealNews, getNews, sendLinks} from "./worker";
import {generateChatMessage} from "./openai";


export const preApiNews = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {

        const news = await getNaverNews();
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
        const {query,start} = request.query;

        const articlePromises: Promise<void>[] = [];
        const news = await getNews(query,start);
        news.filter(news => news.link && news.link.includes("http") && news.link.includes("naver"))
            .forEach(news => articlePromises.push(getArticleDetails(news, AXIOS_OPTIONS, 1)));
        await Promise.all(articlePromises);
        request.transfer = news;
        done();
    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}

export const preSearchNewLink = async (request: IAnyRequest, reply: FastifyReply, done) => {
    try {
        const {query} = request.query;
        const news = await sendLinks(query);
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

        request.transfer = response !== null ? {result : "Success" , massage: response} : {result : "Fail" , massage: "기사를 작성 할 수 없습니다."};
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



