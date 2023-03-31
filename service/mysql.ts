import mysql, { Connection,Pool, Query } from 'mysql';
import unnamed from 'named-placeholders';
import {logger} from "../src/helpers/utils";

const toUnnamed = unnamed();

export default class Mysql {
    private connection: Pool;

    private static INSTANCE: Mysql;

    public static getInstance(): Mysql {
        if (!this.INSTANCE) {
            this.INSTANCE = new Mysql();
        }
        return Mysql.INSTANCE;
    }

    private constructor() {
        this.connection = mysql.createPool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_DB,
        });

         // this.connect();
     }

    connect() {
        // this.connection.connect();
     }

    query(sqlString: string, values = []): Promise<Query> {
        return new Promise(async (resolve, reject) => {
            try {
                return this.connection.query(sqlString, values, (err, results) => {
                    if (err)  logger.error({ err }, 'Failed to query')
                    if (!err) resolve(JSON.parse(JSON.stringify(results)));
                    else reject(err);
                });
            } catch (error) {
                logger.error({ error }, 'Failed to query')
                reject(error);
            }
        });
    }

    namedQuery(sqlString: string, values: {}): Promise<Query> {
        const [query, queryValues] = toUnnamed(sqlString, values);
        return this.query(query, queryValues);
    }

    /*beginTransaction() {
        return new Promise((resolve, reject) => {
            try {
                this.connection.beginTransaction((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    commit() {
        return new Promise((resolve, reject) => {
            try {
                this.connection.commit();
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    rollback() {
        return new Promise((resolve, reject) => {
            try {
                this.connection.rollback();
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }*/

    release() {
        return new Promise((resolve, reject) => {
            try {
                if (this.connection) {
                    // this.connection.end();
                    // this.connection.release();
                    this.connection.getConnection(function (err, connection) {
                        if (err) throw err; // not connected!
                        connection.release();
                    });
                }
                resolve(true);
            } catch (error) {
                logger.error({ error }, 'Failed to release to Sql')
                reject(error);
            }
        });
    }
}
