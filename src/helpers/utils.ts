import * as bcrypt from 'bcryptjs'
import pino from "pino";
import moment from 'moment';
import * as crypto from 'crypto';
import * as base64 from 'base-64';

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
        const date = new Date().toLocaleDateString();
        return new Date(date).getTime() / 1000;
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
export const decodeHtmlEntities = (str: string): string => {
    return str.replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"');
}

export const  extractAuthorAndEmail = (input: string): { name: string, email: string }[] => {
    const result: { name: string, email: string }[] = [];
    const emailRegex = /\S+@\S+\.\S+/;
    const pattern = /(?<name>[\p{L}\p{M}]+[\p{Z}\t]*[\p{L}\p{M}\p{Z}\t]*)[\s\n]*(\(|\b)(?<email>\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)/ug;

    if (!emailRegex.test(input)) {
        result.push({name: input ? input.replace('기자', '').trim() : '', email: ""});
        return result;
    }
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(input)) !== null) {
        const name = match.groups?.name.replace('기자', '').trim() || '';
        const email = match.groups?.email.trim() || '';
        result.push({name, email});
    }

    return result;
}


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

export const getDomain = (url: string) => {
    const domain = url.match(/^https?:\/\/([^/]+)/)[1];
    return domain;
}

export const getDateString = (time: number, type: string) => {
    if (!time) {
        return moment().format("YYYY-MM-DD HH:mm:ss")
    }else{
        if (type === 'default') {
            return moment(time).format("YYYY-MM-DD HH:mm:ss");
        } else {
            return moment.unix(time).format("YYYY-MM-DD HH:mm:ss");
        }
    }
}


export const generate = (timestamp: string, method: string, uri: string, secret_key: string): string => {
    const message = `${timestamp}.${method}.${uri}`;
    const hash = crypto.createHmac('sha256', secret_key).update(message).digest('binary');

    return base64.encode(hash);
}

export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const getNextMin = (ts: number, min: string) => {

    return moment(ts).add("20", "m").format('YYYY-MM-DD HH:mm').slice(0, -1) + "0:00";
}

export type NoParamCallback = (err: NodeJS.ErrnoException | null) => void;

function callback(err) {
    console.log(err);
}
