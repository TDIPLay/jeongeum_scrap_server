import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import axios from 'axios';
import {ResponseType} from "axios/index";
import axiosRetry from "axios-retry";
import {AXIOS_OPTIONS, RSTOCK} from "../helpers/common";
import {hgetData} from "./worker";
import {getRedis} from "../../service/redis";
import {Stock} from "../interfaces";




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


export async function getStockBoard(page: number = 1, stock: string): Promise<any> {

    if (!stock) {
        return null;
    }

    const code = await getStockCode(stock);
    const url = `https://finance.naver.com/item/board.naver?code=${code}&page=${page}`;
    const $ = await axiosCall(url);
    const stockInfo = parseStockInfo($);
    const posts = parsePosts($, code);

    const financeUrl = `https://finance.naver.com/item/main.nhn?code=${code}`;
    const finance = await getFinance(financeUrl);

    const objStock = {
        name: stock,
        code: code,
        stockInfo: stockInfo,
        board: posts,
        finance: finance
    };

    return objStock;
}


async function getStockCode(stock: string): Promise<string> {
    const code = await hgetData(await getRedis(), RSTOCK, "", stock);
    return code;
}

function parseStockInfo($: cheerio.CheerioAPI): Record<string, string> {
    const stockInfo: Record<string, string> = {};
    const stockEl = $('.new_totalinfo dl.blind').eq(0);

    stockEl.find('dd').each((i, element) => {
        if (i === 0) return;
        const text = $(element).text().trim().replace(/[\n\t]/g, '');
        const [key, ...values] = text.split(' ');
        stockInfo[key] = values.join(' ');
    });

    return stockInfo;
}

async function getFinance(url) {
    const $ = await axiosCall(url);


    const tables = $('.tb_type1');
    // console.log(tables.html())
    const annualTable = $(tables[2]);
    const rows = annualTable.find('tr');

    const data = [];
    rows.each((index, element) => {
        const columns = $(element).find('th, td');
        const rowData = [];

        columns.each((colIndex, colElement) => {
           rowData.push($(colElement).text().trim());
        });

        data.push(rowData);
    });

    // Process the data as needed
    return data;
}



function parsePosts($: cheerio.CheerioAPI, code: string): Stock[] {
    const posts: Stock[] = [];

    $('table.type2 tr').each((i, el) => {
        if (i === 0) return;
        const date = $(el).find('td:nth-child(1) span').text().trim();
        let title = $(el).find('td.title a').text().trim().replace(/[^\S\r\n]+/g, ' ');
        if(!title) return;
        const board_link = $(el).find('td.title a').attr('href');
        const link = board_link ? `https://finance.naver.com${board_link}` : null;
        const replyCountMatch = title.match(/\[(\d+)\]/);
        const reply_count = replyCountMatch ? parseInt(replyCountMatch[1]) : 0;
        const author = $(el).find('td:nth-child(3)').text().trim();
        const views = Number($(el).find('td:nth-child(4)').text().trim());
        const sympathy = Number($(el).find('td:nth-child(5)').text().trim());
        const non_sympathy = Number($(el).find('td:nth-child(6)').text().trim());

        if (reply_count) {
            title = title.replace(`[${reply_count}]`, '').trim();
        }

        posts.push({
            date,
            title,
            link,
            author,
            reply_count,
            views,
            sympathy,
            non_sympathy
        });
    });

    return posts;
}
export async function getStockReply(stock, browser) {
    const page = await browser.newPage();

    try {
        await page.goto(stock.link, {waitUntil: "networkidle0", timeout: 9000});

        const commentCountText = await page.$eval(".u_cbox_count", (el) => el.textContent);
        const commentCount = commentCountText ? parseInt(commentCountText) : null;
        const contents = await page.$eval(".view_se", (el) => el.textContent.trim());

        if (commentCount > 0) {
            let textContents;

            const elements = await page.$$eval(".u_cbox_comment_box", (boxes) => boxes.map((box) => {
                    const contentsEl = box.querySelector(".u_cbox_contents");
                    const replyEl = box.querySelector(".u_cbox_reply_cnt");
                    const replyCountText = replyEl ? box.querySelector(".u_cbox_reply_cnt").textContent : null;
                    const replyCount = replyCountText ? parseInt(replyCountText) : 0;
                    const replyBox = [];
                    /*if (replyCount > 0) {
                        const replyElements = box.querySelectorAll(".u_cbox_list");
                        console.log(replyElements.textContent)
                        replyElements.forEach((ele) => {
                            const contentsEl = ele.querySelector(".u_cbox_contents");
                            console.log(contentsEl)
                            const sympathyEl = ele.querySelector(".u_cbox_cnt_recomm");
                            const nonSympathyEl = ele.querySelector(".u_cbox_cnt_unrecomm");
                            const contents = contentsEl ? contentsEl.textContent.trim() : "";
                            const sympathyCount = sympathyEl ? parseInt(sympathyEl.textContent.trim()) : 0;
                            const nonSympathyCount = nonSympathyEl ? parseInt(nonSympathyEl.textContent.trim()) : 0;
                            if (contentsEl || sympathyEl || nonSympathyEl) {
                                replyBox.push({
                                    contents: contents,
                                    sympathy: sympathyCount,
                                    non_sympathy: nonSympathyCount,
                                });
                            }
                        });
                    }*/

                    const sympathyEl = box.querySelector(".u_cbox_cnt_recomm");
                    const nonSympathyEl = box.querySelector(".u_cbox_cnt_unrecomm");
                    const contents = contentsEl ? contentsEl.textContent.trim() : "";
                    const sympathyCount = sympathyEl ? parseInt(sympathyEl.textContent.trim()) : 0;
                    const nonSympathyCount = nonSympathyEl ? parseInt(nonSympathyEl.textContent.trim()) : 0;

                    if (contentsEl || sympathyEl || nonSympathyEl) {
                        return {
                            contents: contents,
                            reply: replyCount,
                            sympathy: sympathyCount,
                            non_sympathy: nonSympathyCount,
                        };
                    }
                })
            );

            if (contents) {
                stock.content = contents;
            }

            textContents = elements.filter((el) => el !== undefined);

            if (textContents.length > 0) {
                stock.reply = textContents;
            }
        }

        await page.close();
    } catch (e) {
        console.log(e);
        console.log(stock.link);
        await page.close();
    }
}
