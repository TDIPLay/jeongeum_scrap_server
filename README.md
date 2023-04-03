# News 
typescript based rest-API architecture with fastify framework.

## How to use

### 1. Clone this repo & install dependencies

Install Node dependencies:

## How to use

### 1. Clone this repo & install dependencies

Install Node dependencies:

`npm install`



### 2. Start the Fastify server
Launch your Fastify server with this command:

```sh
npm run dev
```

## For Build Generation
Install Pm2 dependencies:

`npm install pm2 -g`

Build server with command:

```sh
npm run build
```


"build": "tsc -p tsconfig.json && cp ./.env ./build/.env && npm run pm2:stop && npm run pm2:start && pm2 list",
"start": "node build/src/talk-server.js | pino-pretty --colorize",
"pm2:start": "pm2 start ./ecosystem.config.js",
"pm2:stop": "pm2 stop build/src/talk-server.js",
"pm2:debug": "pm2 trigger talk-server debug",
"pm2:kill": "pm2 kill",

- Check out the [Fastify docs](https://www.fastify.io/docs/latest/)
