import {FastifyInstance} from 'fastify'
import {apiSchema, signupSchema} from '../schema'
import {
    apiAuth,
    apiMemoryRate,
    apiSyncUp,
    preApiRankNews,
    preApiRealNews,
    preApiSyncUp,
    preOpenAi,
    preSearchNewLink,
    preSearchNews,
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
        schema: apiSchema, preHandler: preSearchNews,handler: apiSyncUp
    })
    fastify.route({
        method: 'GET',
        url: '/search',
        schema: apiSchema, preHandler: preSearchNewLink,handler: apiSyncUp
    })
    fastify.route({
        method: 'GET',
        url: '/rank',
        schema: apiSchema, preHandler: preApiRankNews,handler: apiSyncUp
    })
    fastify.route({
        method: 'GET',
        url: '/real',
        schema: apiSchema, preHandler: preApiRealNews,handler: apiSyncUp
    })
    fastify.route({
        method: 'GET',
        url: '/memory',
        schema: apiSchema, handler: apiMemoryRate
    })
    fastify.route({
        method: 'GET',
        url: '/ai',
        schema: apiSchema, preHandler: preOpenAi,handler: apiSyncUp
    })
    fastify.route({
        method: 'GET',
        url: '/oauth',
        schema: apiSchema, handler: apiAuth
    })

    fastify.route({
        method: 'POST',
        url: '/signup',
        schema: signupSchema,
        handler: signUp,
    })
}

export default apiRouter
