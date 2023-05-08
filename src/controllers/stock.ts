import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import axios from 'axios';
import {ResponseType} from "axios/index";
import axiosRetry from "axios-retry";
import {RPRESS, RSTOCK} from "../helpers/common";
import {hgetData} from "./worker";
import {getRedis} from "../../service/redis";

interface Stock {
    date: string;
    title: string;
    author: string;
    views: number;
    sympathy: number;
    non_sympathy: number;
}

const AXIOS_OPTIONS = {
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36",
    },
    encoding: null,
    method: "GET",
    timeout: 5000,
    maxRedirects: 3,
    onRedirect: (redirectRequest, redirectResponse) => {
        console.log(`Redirected to: ${redirectResponse.headers.location}`);
    },
    responseType: "arraybuffer" as ResponseType,
};

const noTypePress = ['finomy.com', 'ikunkang.com', 'www.rapportian.com']

async function axiosCall(link: string): Promise<cheerio.CheerioAPI> {

    try {
        axiosRetry(axios, {
            retries: 2,
            retryDelay: (retryCount) => {
                return retryCount * 1000; // 1초, 2초, 3초
            },
            shouldResetTimeout: true,
        });

        let response = await axios.get(link, AXIOS_OPTIONS);

        const content_type = response.headers['content-type'].match(/charset=(.+)/i);
        const no_type = noTypePress.some(x => link.includes(x))
        const encoding = content_type && content_type.length ? content_type[1] : no_type ? "euc-kr" : "utf-8";

        const data = encoding.toLowerCase() !== 'utf-8' ? iconv.decode(response.data, encoding) : response.data;

        return cheerio.load(data);

    } catch (error) {
        console.error(`Error axiosCall link: ${error.message} => ${link}`);
        return null;
    }
}


export async function getStockBorad(page: number = 1, stock: string): Promise<any> {

    if (stock) {
        const code = await hgetData(await getRedis(), RSTOCK, "", stock);
        const url = `https://finance.naver.com/item/board.naver?code=${code}&page=${page}`;
        const $ = await axiosCall(url);
        const posts: Stock[] = [];
        const stockInfo = [];
        let objStock = { name: stock, code: code, stockInfo: {},board: []}
        const target = $('.new_totalinfo dl.blind').eq(0); // 첫 번째 new_totalinfo 요소 선택

        target.find('dd').each((i , element) => {
            if (i === 0) return;
            const text = $(element).text().trim().replace(/[\n\t]/g, ''); // 공백과 개행문자 제거
            const splitText = text.split(' ');

            const key = splitText[0]; // '종목명', '종목코드', '현재가' 등
            const value = splitText.slice(1).join(' '); // key 제외한 나머지 text

            objStock.stockInfo[key] = value;
        });
        $('table.type2 tr').each((i, el) => {
            // 헤더 스킵
            if (i === 0) return;
            const date = $(el).find('td:nth-child(1) span').text().trim();
            const title = $(el).find('td.title a').text().trim();
            const author = $(el).find('td:nth-child(3)').text().trim();
            const views = Number($(el).find('td:nth-child(4)').text().trim());
            const sympathy = Number($(el).find('td:nth-child(5)').text().trim());
            const non_sympathy = Number($(el).find('td:nth-child(6)').text().trim());

            if (title) posts.push({
                date,
                title,
                author,
                views,
                sympathy,
                non_sympathy,
            });
        });

        objStock.board = posts;

        return objStock;
    }
    return null;
}
