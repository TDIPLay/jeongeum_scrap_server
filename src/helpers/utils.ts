import * as bcrypt from 'bcryptjs'
import pino from "pino";
import moment from 'moment';
import fs from "fs";

export const utils = {
    isJSON: (data: string) => {
        try {
            JSON.parse(data)
        } catch (e) {
            return false
        }
        return true
    },
    getTime: () => {
        const date = new Date()
        const time = date.getTime()
        return time
    },
    genSalt: (saltRounds, value) => {
        return new Promise((resolve, reject) => {
            const salt = bcrypt.genSaltSync(saltRounds)
            bcrypt.hash(value, salt, (err, hash) => {
                if (err) reject(err)
                resolve(hash)
            })
        })
    },
    compareHash: (hash, value) => {
        return new Promise((resolve, reject) => {
            bcrypt.compare(value, hash, (err, result): boolean | any => {
                if (err) reject(err)
                resolve(result)
            })
        })
    },
    /* healthCheck: (): Promise<void> => {
       return new Promise((resolve, reject) => {
         prisma
           .$queryRaw`SELECT 1`
           .then(() => {
             resolve()
           })
           .catch((e) => {
             reject(e)
           })
       })
     }*/
}

export const logger = pino({
    name: 'rtb-data-server',
    level: 'debug'
});

/*export const fetch_Object = (raw: any, seqKey: any): any => {
    let obj = {};

    for (const key in raw) {
        if (seqKey.length > 1) {
            if (typeof obj[raw[key][seqKey[0]]] === "undefined") obj[raw[key][seqKey[0]]] = {}
            obj[raw[key][seqKey[0]]][raw[key][seqKey[1]]] = raw[key];
        } else {
            obj[raw[key][seqKey]] = raw[key];
        }
    }
    return obj;
}*/
export const fetch_Object = (raw: any, seqKey: any): any => {
    const obj = raw.reduce((accumulator, item) => {
        const key1 = item[seqKey[0]];
        const key2 = seqKey.length > 1 ? item[seqKey[1]] : null;

        if (!accumulator[key1]) {
            accumulator[key1] = seqKey.length > 1 ? {} : null;
        }

        if (key2) {
            accumulator[key1][key2] = item;
        } else {
            accumulator[key1] = item;
        }

        return accumulator;
    }, {});

    return obj;
}
/*export const fetch_Object = (raw: any, seqKey: any): any => {
    const obj = {};

    for (const item of raw) {
        const key1 = item[seqKey[0]];
        const key2 = seqKey.length > 1 ? item[seqKey[1]] : null;

        if (!obj[key1]) {
            obj[key1] = seqKey.length > 1 ? {} : null;
        }
        if(key2 != null)
        obj[key1][key2] = item;
    }

    return obj;
}*/
function replaceVars(raw: any, seqKey: any) {
    let obj;
    obj = raw.reduce((acc, item) => {
        for (const key in raw) {
            for (const tkey in seqKey) {
                Object.assign(acc, item[tkey])
            }
            Object.assign(acc, raw[key]);
        }
        return acc;
    }, {});
    return obj;
}

export const getDateString = (dateFormat: string) => {
    dateFormat = (dateFormat == "default") ? "YYYY-MM-DD||HH:mm:ss" : dateFormat;
    var return_date = moment().format(dateFormat);

    return return_date;
}
export const getNextMin = (ts: number, min: string) => {

    return moment(ts).add("20", "m").format('YYYY-MM-DD HH:mm').slice(0, -1) + "0:00";
}

export type NoParamCallback = (err: NodeJS.ErrnoException | null) => void;

function callback(err) {
    console.log(err);
}
