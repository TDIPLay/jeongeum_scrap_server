import { FastifyReply } from "fastify"
import {ERROR400, ERROR500, MESSAGE} from "./constants"
import {logger} from "./utils";

export const ERRORS = {
  invalidToken: new Error('Token is invalid.'),
  userExists: new Error('User already exists'),
  userNotExists: new Error('User not exists'),
  userCredError: new Error('Invalid credential'),
  tokenError: new Error('Invalid Token'),
}

export function handleServerError(reply: FastifyReply, error: any) {
  logger.error({ error },"err handler")
  return reply.status(ERROR400.statusCode).send({result: MESSAGE.FAIL, code: ERROR400.statusCode, message: ERROR400});
}


export function xServerError(error: any) {
  logger.error({ error },"err ex")
}
