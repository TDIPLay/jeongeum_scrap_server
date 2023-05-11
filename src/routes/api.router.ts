import {FastifyInstance} from 'fastify'
import {apiSchema, signupSchema} from '../schema'
import {
    apiAuth,
    apiBriefingMail,
    apiLogin,
    apiMemoryRate,
    apiSyncUp,
    passUrl,
    preApiDataLab,
    preApiRankNews,
    preApiRealNews,
    preApiSyncUp, preKoaNap,
    preOpenAi, preReply,
    preSearchNewLink,
    preSearchNews,
    preSocial,
    preSocialCallback,
    preSocialLogin, preStock,
    signUp
} from "../controllers";

async function apiRouter(fastify: FastifyInstance) {
    //동기화 모듈 사용안함
    fastify.route({
        method: 'GET',
        url: '/active_sync',
        schema: apiSchema, preHandler: preApiSyncUp, handler: apiSyncUp
    })
    //최근 뉴스스크랩 기본데이터+기자+이메일등 최대 ~ 1000  전달
    fastify.route({
        method: 'GET',
        url: '/search_all',
        schema: apiSchema, preHandler: preSearchNews, handler: apiSyncUp
    })
    //키워드별 신규 뉴스스크랩 기본데이터+기자+이메일등 전달
    fastify.route({
        method: 'GET',
        url: '/search',
        schema: apiSchema, preHandler: preSearchNewLink, handler: apiSyncUp
    })
    //언론사별 rank스크랩 기본데이터+기자+이메일등 1~5위까지 전달
    fastify.route({
        method: 'GET',
        url: '/rank',
        schema: apiSchema, preHandler: preApiRankNews, handler: apiSyncUp
    })
    //서버 메모리 체크
    fastify.route({
        method: 'GET',
        url: '/memory',
        schema: apiSchema, handler: apiMemoryRate
    })
    //Chat gpt
    fastify.route({
        method: 'GET',
        url: '/ai',
        schema: apiSchema, preHandler: preOpenAi, handler: apiSyncUp
    })
    //소셜 로그인 인증
    fastify.route({
        method: 'POST',
        url: '/social',
        schema: apiSchema, preHandler: preSocialLogin, handler: apiSyncUp
    })
    //소셜 로그인 ToKen 발급 및 인증
    fastify.route({
        method: 'GET',
        url: '/social/:social',
        schema: apiSchema, preHandler: preSocial, handler: apiAuth
    })
    //소셜 인증 콜백
    fastify.route({
        method: 'GET',
        url: '/social/oauth/:social',
        schema: apiSchema, preHandler: preSocialCallback, handler: apiLogin
    })
    //로그인 관련 페이지 이동
    fastify.route({
        method: 'GET',
        url: '/redirect',
        schema: apiSchema, handler: passUrl
    })
    //트렌드/검색량 등등 데이터 전달
    fastify.route({
        method: 'GET',
        url: '/datalab',
        schema: apiSchema, preHandler: preApiDataLab, handler: apiSyncUp
    })
    //메일 전송
    fastify.route({
        method: 'POST',
        url: '/sendmail',
        handler: apiBriefingMail,
    })
    //임시 자연어 분석
    fastify.route({
        method: 'GET',
        url: '/koanlp',
        schema: apiSchema,preHandler:preKoaNap, handler: apiSyncUp
    })
    //주식 데이터 전달 등락/게시글/댓글/재무지표 전달
    fastify.route({
        method: 'GET',
        url: '/stock',
        schema: apiSchema,preHandler:preStock, handler: apiSyncUp
    })
    //뉴스 댓글 전달
    fastify.route({
        method: 'GET',
        url: '/news_reply',
        schema: apiSchema,preHandler:preReply, handler: apiSyncUp
    })

    //api 인증서 발급 사용안함
    fastify.route({
        method: 'POST',
        url: '/signup',
        schema: signupSchema,
        handler: signUp,
    })

    //테스트
    fastify.route({
        method: 'GET',
        url: '/real',
        schema: apiSchema, preHandler: preApiRealNews, handler: apiSyncUp
    })
}

export default apiRouter
