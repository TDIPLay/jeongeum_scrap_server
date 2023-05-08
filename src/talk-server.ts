import { logger } from './helpers/utils';
import fastify from 'fastify'
import apiRouter from './routes/api.router';
import loadConfig from './config'
import ON_DEATH from "death";
import zlib from "zlib";
import service from '../service/common_service'
import process from "process";
import pmx from "@pm2/io";
loadConfig()


const port = process.env.API_PORT || 8080;
const server = fastify({
  logger: process.env.NODE_ENV !== 'production' ? logger : false
})
let debug_flag_log = false;
let flag_log = false;

process.on('unhandledRejection', (e) => {
  //console.error(e)
  console.log('Exiting finally...')
  process.exit(1)
})

// DB 업데이트 Trigger
pmx.action('db_update', (reply)=> {
  //service.getInstance().module_start();
  reply({answer: 'db_update'});
});

// Debug Log 콘솔 출력여부 Toggle Trigger
pmx.action('debug', (reply) =>{
  service.debug_flag_log = !service.debug_flag_log;
  reply({answer: 'debug mode : ' + debug_flag_log});
});


ON_DEATH( () =>{
  console.log('Exiting finally...')
  //service.getInstance().sql_release();
  setTimeout(function () {
    process.exit(0)
  }, 100)
})


const startServer = async () => {

  try {


    server.addContentTypeParser('application/json', {parseAs: 'buffer'}, (req, body, done) => {
      if (req.headers['content-encoding'] && req.headers['content-encoding'] === 'gzip') {
        zlib.gunzip(body, function (err, dezipped) {
          if (err) {
            done(err, null)
          } else {
            try {
              const json = JSON.parse(dezipped.toString('utf-8'))
              done(null, json)
            } catch (err) {
              if (flag_log) {
                console.log('err _ json' + dezipped.toString('utf-8'))
              } else {
                console.log('err_json /on flag_log')
              }
              done(err, null)
            }
          }
        })
      } else {
        try {
          const json = JSON.parse(body.toString('utf-8'))
          done(null, json)

        } catch (err) {
          err.statusCode = 400
          done(err, undefined)
        }
      }
    })

    server.register(require('fastify-formbody'))
    server.register(require('fastify-cors'))
    server.register(require('fastify-helmet'))
    server.register(apiRouter, { prefix: '/tdi/talk/v1' })

    server.setErrorHandler((error, request, reply) => {
      server.log.error(error);
    })

    server.get('/', (request, reply) => {
      reply.send({ name: 'talknews-server' })
    })

    if (process.env.NODE_ENV === 'production') {
      for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, () =>
            server.close().then((err) => {
              console.log(`close application on ${signal}`)
              process.exit(err ? 1 : 0)
            }),
        )
      }
    }
    await server.listen(port,process.env.API_HOST)
    await service.getInstance().module_start();
  } catch (e) {
    console.error("server........")
    console.error(e)
  }
}

startServer()
