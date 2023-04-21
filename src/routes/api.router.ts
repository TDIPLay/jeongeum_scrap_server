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
    preApiSyncUp,
    preOpenAi,
    preSearchNewLink,
    preSearchNews,
    preSocial,
    preSocialCallback,
    preSocialLogin,
    signUp
} from "../controllers";

async function apiRouter(fastify: FastifyInstance) {

    fastify.route(
        {
            method: 'GET',
            url: '/active_sync',
            schema: apiSchema, preHandler: preApiSyncUp, handler: apiSyncUp
        })

    fastify.route({
        method: 'GET',
        url: '/search_all',
        schema: apiSchema, preHandler: preSearchNews, handler: apiSyncUp
    })
    fastify.route({
        method: 'GET',
        url: '/search',
        schema: apiSchema, preHandler: preSearchNewLink, handler: apiSyncUp
    })
    fastify.route({
        method: 'GET',
        url: '/rank',
        schema: apiSchema, preHandler: preApiRankNews, handler: apiSyncUp
    })
    fastify.route({
        method: 'GET',
        url: '/real',
        schema: apiSchema, preHandler: preApiRealNews, handler: apiSyncUp
    })
    fastify.route({
        method: 'GET',
        url: '/memory',
        schema: apiSchema, handler: apiMemoryRate
    })
    fastify.route({
        method: 'GET',
        url: '/ai',
        schema: apiSchema, preHandler: preOpenAi, handler: apiSyncUp
    })
    fastify.route({
        method: 'POST',
        url: '/social',
        schema: apiSchema, preHandler: preSocialLogin, handler: apiSyncUp
    })
    fastify.route({
        method: 'GET',
        url: '/social/:social',
        schema: apiSchema, preHandler: preSocial, handler: apiAuth
    })
    fastify.route({
        method: 'GET',
        url: '/social/oauth/:social',
        schema: apiSchema, preHandler: preSocialCallback, handler: apiLogin
    })


    fastify.route({
        method: 'GET',
        url: '/datalab',
        schema: apiSchema, preHandler: preApiDataLab, handler: apiSyncUp
    })
    fastify.route({
        method: 'POST',
        url: '/sendmail',
        handler: apiBriefingMail,
    })


    fastify.route({
        method: 'GET',
        url: '/redirect',
        schema: apiSchema, handler: passUrl
    })

    fastify.route({
        method: 'POST',
        url: '/signup',
        schema: signupSchema,
        handler: signUp,
    })
}

export default apiRouter
