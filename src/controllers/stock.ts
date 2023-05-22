import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import axios, {ResponseType} from 'axios';
import {R_STOCK} from "../helpers/common";
import {hgetData} from "./worker";
import {getRedis} from "../../service/redis";
import {Stock} from "../interfaces";
import moment from "moment/moment";
import {isValidDate, sleep} from "../helpers/utils";
import Mysql from "../../service/mysql";


const noTypePress = ['finomy.com', 'ikunkang.com', 'www.rapportian.com']
export const AOPTIONS = {
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36",
    },
    encoding: null,
    method: "GET",
    timeout: 10000,
    responseType: "arraybuffer" as ResponseType,
};

async function axiosCall(link: string): Promise<cheerio.CheerioAPI> {

    try {
        /*   axiosRetry(axios, {
               retries: 2,
               retryDelay: (retryCount) => {
                   return retryCount * 1000; // 1초, 2초, 3초
               },
               shouldResetTimeout: true,
           });*/

        let response = await axios.get(link, AOPTIONS);

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
    const posts = parsePosts($);

    const financeUrl = `https://finance.naver.com/item/main.nhn?code=${code}`;
    const finance = await getFinanceTable(financeUrl, ".tb_type1", 2);

    return {
        name: stock,
        code: code,
        stockInfo: stockInfo,
        board: posts,
        finance: finance
    };
}


export async function getStockPage(page: number = 1, stock: string, rcode: string, endDate: string) {
    //console.log(`start stock analysis => ${stock}`)
    let keys = '';
    if (!stock || !endDate) {
        return null;
    }
    let code = rcode;

    if (!rcode) {
        code = await getStockCode(stock);
    }

    try {
        const url = [
            `https://finance.naver.com/item/board.naver?code=${code}&page=`,
            `https://finance.naver.com/item/frgn.naver?code=${code}&page=`,
            `https://finance.naver.com/item/news_news.naver?code=${code}&page=`,
            `https://finance.naver.com/item/news_notice.naver?code=${code}&page=`,
        ];
        const sub = await getFinance(url[1])

        if (!sub) {
            //console.log('코넥스 패스')
            return null;
        }

        const objCount = {
            company: stock,
            code: code,
            description: sub,
            board: {},
            finance: {},
            newsCnt: {},
            disclosureCnt: {}
        };
        const processFinanceData = async (url: string, index: number) => {
            let lastData = '';
            // 100000  이전까지만 조회
            for (let i = 1; i < 100000; i++) {
                const finance = await getFinanceTable(`${url}${i}`, (!index || index === 1) ? ".type2" : index === 2 ? ".type5" : ".type6", index === 1 ? 1 : 0);
                const len = finance.length;
                if (len === 1) break;
                if (!index) {
                    if (lastData === `${finance[len - 1][1]}${finance[len - 1][2]}${finance[len - 1][3]}${finance[len - 1][4]}`) {
                        break;
                    }
                } else if (lastData === `${finance[len - 1][1]}${finance[len - 1][2]}`) {
                    break;
                }

                if (i % 1000 === 0) {
                    console.log(`${stock} scrap => ${url}${i}`)
                }
                const targetObj = objCount[!index ? `board` : index === 1 ? 'finance' : index === 2 ? 'newsCnt' : 'disclosureCnt'];
                let endFlag = false;

                for (const news of finance.slice(index === 1 ? 2 : 1)) {
                    let date = news[0].replace(/\./g, '');
                    if (index === 0) {
                        date = date.split(' ')[0];

                        if (!targetObj[date]) {
                            targetObj[date] = {
                                authors: new Set(),
                                boardCount: 0,
                                viewCount: 0,
                                sympathyCount: 0,
                                nonSympathyCount: 0,
                                duplicateRatio: 0
                            };
                        }

                        if (isNaN(news[3]) || isNaN(news[4]) || isNaN(news[5])) {
                            console.log(`${url}${i}`)
                            console.log(`Value is Nan => ${news[3]},${news[4]},${news[5]}`)
                        }

                        targetObj[date].authors.add(news[2]);
                        targetObj[date].boardCount = (targetObj[date].boardCount || 0) + 1;
                        if (news[5] === undefined) {
                            targetObj[date].viewCount += !isNaN(news[2]) ? Number(news[2]) : 0;
                            targetObj[date].sympathyCount += !isNaN(news[3]) ? Number(news[3]) : 0;
                            targetObj[date].nonSympathyCount += !isNaN(news[4]) ? Number(news[4]) : 0;
                        } else {
                            targetObj[date].viewCount += !isNaN(news[3]) ? Number(news[3]) : 0;
                            targetObj[date].sympathyCount += !isNaN(news[4]) ? Number(news[4]) : 0;
                            targetObj[date].nonSympathyCount += !isNaN(news[5]) ? Number(news[5]) : 0;
                        }
                        //전체 게시글 대비 작성자 중복율 = ((전체 게시글 수 - 작성자 수) / 전체 게시글 수) * 100
                        targetObj[date].duplicateRatio = ((targetObj[date].boardCount - targetObj[date].authors.size) / targetObj[date].boardCount) * 100;

                        lastData = `${news[1]}${news[2]}${news[3]}${news[4]}`;
                        if (!isValidDate(date) || (moment(date).unix() < moment(endDate).unix())) {
                            break;
                        }

                    } else if (index === 1) {
                        if (!targetObj[date]) {
                            targetObj[date] = [news];
                        } else {
                            targetObj[date].push(news);
                            lastData = `${news[1]}${news[2]}`;
                        }
                    } else if (index === 2) {
                        if (news && news.length > 2) {
                            date = news[0].includes('연관기사') ? news[3].split(' ')[0].replace(/\./g, '') : news[2].split(' ')[0].replace(/\./g, '');

                            targetObj[date] = (targetObj[date] || 0) + 1;
                            lastData = `${news[1]}${news[2]}`;
                        } else {
                            endFlag = true;
                        }
                    } else if (index === 3) {
                        if (news && news.length > 2) {
                            date = news[2].split(' ')[0].replace(/\./g, '');
                            targetObj[date] = (targetObj[date] || 0) + 1;
                            lastData = `${news[1]}${news[2]}`;
                        } else {
                            endFlag = true;
                        }
                    }
                }

                keys = Object.keys(targetObj)[0];
                if (endFlag || targetObj[endDate] !== undefined || !isValidDate(keys) || (moment(keys).unix() < moment(endDate).unix())) {
                    break;
                }
                await sleep(10);
            }
        };

        await processFinanceData(url[0], 0); // Board
        await processFinanceData(url[1], 1); // Finance
        await processFinanceData(url[2], 2); // News
        await processFinanceData(url[3], 3); // Disclosure
        await setDataBase(objCount, endDate);
    } catch (e) {
        console.log(`=================keys${keys}`)
        console.log(e)
    }
}

async function getStockCode(stock: string): Promise<string> {
    return await hgetData(await getRedis(), R_STOCK, "", stock);
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

async function getFinanceTable(url: string, ele: string, idx: number) {
    const $ = await axiosCall(url);
    const tables = $(ele);
    const annualTable = $(tables[idx]);
    const rows = annualTable.find('tr');
    const data = [];

    rows.each((index, element) => {
        const columns = $(element).find('th, td');
        const rowData = [];

        columns.each((colIndex, colElement) => {
            if ($(colElement).text().trim() !== '') rowData.push($(colElement).text().trim());
        });

        if (rowData.length !== 0) data.push(rowData);
    });

    // Process the data as needed
    return data;
}

async function getFinance(url: string) {
    const $ = await axiosCall(url);
    const ele = $('.description');
    let f_class = "";

    if (ele.find('.kosdaq')) {
        f_class = ele.find('img').attr('alt')

    } else if (ele.find('.kospi')) {
        f_class = ele.find('img').attr('alt')
    }
    if (ele.find('img').attr('alt') === '코넥스') {
        f_class = '';
    }

    return f_class;
}

async function setDataBase(data, endDate) {
    const insertQueries = [];
    const createInsertQuery = (date, company, code, newsCount, disclosureCount, boardCount, viewCount, sympathyCount, nonSympathyCount, duplicateRatio,
                               closingPrice, stockPriceChangeRate, tradingVolume, tradingValue, institutionalInvestors, foreignInvestors, kosdaqKospi) => {

        const insertQuery =
            `INSERT INTO stock_information (date, company, code, news_count, disclosure_count, post_count,
                                            views, sympathy, non_sympathy, id_duplicate_ratio,
                                            closing_price, stock_price_change_rate, trading_volume,
                                            trading_value, institutional_investors, foreign_investors,
                                            kosdaq_kospi)
             VALUES ('${date}', '${company}', '${code}', ${newsCount}, ${disclosureCount}, ${boardCount},
                     ${viewCount}, ${sympathyCount}, ${nonSympathyCount}, ${duplicateRatio},
                     ${closingPrice}, '${stockPriceChangeRate}', ${tradingVolume}, ${tradingValue},
                     '${institutionalInvestors}', '${foreignInvestors}', '${kosdaqKospi}') ON DUPLICATE KEY
            UPDATE
                news_count = ${newsCount},
                disclosure_count = ${disclosureCount},
                post_count = ${boardCount},
                views = ${viewCount},
                sympathy = ${sympathyCount},
                non_sympathy = ${nonSympathyCount},
                id_duplicate_ratio = ${duplicateRatio},
                closing_price = ${closingPrice},
                stock_price_change_rate = '${stockPriceChangeRate}',
                trading_volume = ${tradingVolume},
                trading_value = ${tradingValue},
                institutional_investors = '${institutionalInvestors}',
                foreign_investors = '${foreignInvestors}',
                kosdaq_kospi = '${kosdaqKospi}';`;

        return insertQuery;
    };
    const DateKey = [...new Set([...Object.keys(data.board), ...Object.keys(data.finance), ...Object.keys(data.newsCnt), ...Object.keys(data.disclosureCnt)])];
//['날짜','종가','전일비', '등락률','거래량', '기관','외국인'],

    for (const date of DateKey) {
        if (!isValidDate(date) || moment(date).unix() < moment(endDate).unix()) continue;

        const boardData = data.board[date];
        const financeData = data.finance[date] || 0;
        const newsCount = data.newsCnt[date] || 0;
        const disclosureCount = data.disclosureCnt[date] || 0;
        const closingPrice = financeData ? Number(financeData[0][1].replace(/,/g, '')) : 0;
        const tradingVolume = financeData ? Number(financeData[0][4].replace(/,/g, '')) : 0;

        const insertQuery = createInsertQuery(
            date,
            data.company,
            data.code,
            newsCount,
            disclosureCount,
            boardData ? boardData.boardCount : 0,
            boardData ? boardData.viewCount : 0,
            boardData ? boardData.sympathyCount : 0,
            boardData ? boardData.nonSympathyCount : 0,
            boardData ? boardData.duplicateRatio : 0,
            financeData ? closingPrice : 0,
            financeData ? financeData[0][3].replace(/[+-]%/g, '') : '-',
            financeData ? tradingVolume : 0,
            financeData ? tradingVolume * closingPrice : 0,
            financeData ? financeData[0][5].replace(/,/g, '') : '-',
            financeData ? financeData[0][6].replace(/,/g, '') : '-',
            data.description
        );
        await Mysql.getInstance().query(insertQuery);
        //insertQueries.push(insertQuery);
    }

// 생성된 삽입 쿼리 출력
    /* for (const query of insertQueries) {
         //console.log(query)
         await Mysql.getInstance().query(query);
     }*/

}

function parsePosts($: cheerio.CheerioAPI): Stock[] {
    const posts: Stock[] = [];

    $('table.type2 tr').each((i, el) => {
        if (i === 0) return;
        const date = $(el).find('td:nth-child(1) span').text().trim();
        let title = $(el).find('td.title a').text().trim().replace(/[^\S\r\n]+/g, ' ');
        if (!title) return;
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

function parseCountPosts($: cheerio.CheerioAPI) {
    const posts = {};

    $('table.type2 tr').each((i, el) => {
        if (i === 0) return;
        const date = $(el).find('td:nth-child(1) span').text().trim().split(" ")[0];
        const author = $(el).find('td:nth-child(3)').text().trim();
        const views = Number($(el).find('td:nth-child(4)').text().trim().replace(/,/g, ''));
        const sympathy = Number($(el).find('td:nth-child(5)').text().trim().replace(/,/g, ''));
        const non_sympathy = Number($(el).find('td:nth-child(6)').text().trim().replace(/,/g, ''));

        if (!posts[date]) {
            posts[date] = {
                authors: new Set(),
                viewCount: 0,
                sympathyCount: 0,
                nonSympathyCount: 0,
                duplicateRatio: 0
            };
        }

        const post = posts[date];
        post.authors.add(author);
        post.viewCount += views;
        post.sympathyCount += sympathy;
        post.nonSympathyCount += non_sympathy;

        post.duplicateRatio = post.authors.size / (i - 1);
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

export function genStockHTML(raw): string {
    return `
         <html>
      <head>
        <style>
          table {
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            border: 1px solid black;
            padding: 8px;
            text-align: right;
          }
          th {
            background-color: lightgray;
          }
          .negative {
            color: red;
          }
          .positive {
            color: blue;
          }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <th>번호</th>
            <th>날짜</th>
            <th>회사</th>
            <th>뉴스 수</th>
            <th>공시 수</th>
            <th>토론글 수</th>
            <th>조회 수</th>
            <th>공감</th>
            <th>비공감</th>
            <th>ID 중복 비율</th>
            <th>종가</th>
            <th>주가 변동률</th>
            <th>거래량</th>
            <th>거래금액</th>
            <th>기관 투자자</th>
            <th>외국인 투자자</th>
            <th>KOSDAQ KOSPI</th>
          </tr>
          ${raw.map((row) => `
            <tr>
              <td>${row.no}</td>
              <td>${row.date.split('T')[0]}</td>
              <td>${row.company}</td>
              <td>${row.news_count.toLocaleString()}</td>
              <td>${row.disclosure_count.toLocaleString()}</td>
              <td>${row.post_count.toLocaleString()}</td>
              <td>${row.views.toLocaleString()}</td>
              <td>${row.sympathy.toLocaleString()}</td>
              <td>${row.non_sympathy.toLocaleString()}</td>
              <td>${row.id_duplicate_ratio}</td>
              <td class="${row.closing_price < 0 ? 'negative' : 'positive'}">${row.closing_price.toLocaleString()}</td>
              <td class="${row.stock_price_change_rate < 0 ? 'negative' : 'positive'}">${row.stock_price_change_rate.toLocaleString()}</td>
              <td>${row.trading_volume.toLocaleString()}</td>
              <td>${row.trading_value.toLocaleString()}</td>
               <td class="${row.institutional_investors < 0 ? 'negative' : 'positive'}">${row.institutional_investors.toLocaleString()}</td>
              <td class="${row.foreign_investors < 0 ? 'negative' : 'positive'}">${row.foreign_investors.toLocaleString()}</td>
              <td>${row.kosdaq_kospi}</td>
            </tr>
          `).join('')}
        </table>
      </body>
    </html>
        `;

}
