
import { FastifyRequest } from 'fastify';


export interface IImpRequest extends FastifyRequest {
    transfer: any;
    body: any
}
export interface IErrRequest extends FastifyRequest {
    transfer: any;
    body: any,
    query: {
        err: string,
        settop_box_id: number
    }
}
export interface IAnyRequest extends FastifyRequest {
    transfer: any;
    body: any,
    query: any
}
export interface Array<T> {
    // narrowing
    filter<S extends T>(
        predicate: (value: T, index: number, array: T[]) => value is S,
        thisArg?: any
    ): S[];

    // non-narrowing
    filter(
        predicate: (value: T, index: number, array: T[]) => unknown,
        thisArg?: any
    ): T[];
}
export interface IGetPresign {
    fileName: string;
}

export interface IPutPresign {
    userId: number;
    fileName: string;
}
export interface IUserRequest extends FastifyRequest {
    body: any
}
