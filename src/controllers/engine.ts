import {logger} from "../helpers/utils";
import mysql from "../../service/mysql";
import moment from "moment";
import {getRedis} from "../../service/redis";
import {promisify} from "util";

export async function getNewsScap(): Promise<boolean> {


    const redis = await getRedis();
    // initRedisHmSet("Scrap", redis, JSON.stringify(obj), 368000);

    return true;
}






export async function init_Transaction(): Promise<boolean> {
    const redis = await getRedis();
    const tm = moment().unix();
    const hscan = promisify(redis.hscan).bind(redis);

    const scanAll = async (pattern) => {
        let rediskey = '';
        let cursor = '0';
        do {
            const reply = await hscan('Transaction', cursor, "COUNT", "100")
            cursor = reply[0];
            for (const key in reply[1]) {
                if (reply[1].hasOwnProperty(key)) {
                    if (parseInt(key) % 2 == 0) {
                        rediskey = reply[1][key];
                    } else {
                        try {
                            const uData = JSON.parse(reply[1][key]);
                            if ((tm - uData.tm) > 3600) {
                                redis.hdel('Transaction', rediskey);
                                console.log(`deleted => ${rediskey}_time:${tm - uData.tm}`);
                            }
                        }catch (e) {
                            console.log(e)
                        }
                    }
                }
            }
        } while (cursor !== '0');
    }
    await scanAll('');


    /* await redis.hkeys("Transaction", async (err, reply) => {
         if (reply != '') {
             const hget_Async: any = promisify(redis.hget).bind(redis);
             for (const key in reply) {
                 const userData = await hget_Async("Transaction", reply[key]);
                 const uData = JSON.parse(userData);

                 if ((tm - uData.tm) > 3600) {
                     redis.hdel("Transaction", reply[key])
                     console.log(`deleted ${reply[key]}`)
                 }
             }
         }
     })*/
    return true;
}
