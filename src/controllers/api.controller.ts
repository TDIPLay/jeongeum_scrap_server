import {FastifyReply} from "fastify"
import {ERROR403, ERROR404, MESSAGE, STANDARD} from "../helpers/constants"
import {handleServerError} from "../helpers/errors"
import {IAnyRequest, IUserRequest} from "../interfaces";
import * as JWT from 'jsonwebtoken'
import {utils} from "../helpers/utils";
import {generateChatMessage} from "./openai";
import {sendBriefingMail, sendMail} from "./mailer";


export const apiSyncUp = async (request: IAnyRequest, reply: FastifyReply) => {
    try {
        reply.status(STANDARD.SUCCESS).send(request.transfer)
    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}

export const apiAuth = async (request: IAnyRequest, reply: FastifyReply) => {
    try {
        //const {code,state} = request.query
        //service.kakao_a_key = await exampleUsage(code,state);
        if(request.transfer){
            reply.redirect(request.transfer)
        }else{
            reply.status(ERROR403.statusCode).send(ERROR403.message)
        }

    } catch (e) {

        handleServerError(reply, e)
    }
}
export const apiLogin = async (request: IAnyRequest, reply: FastifyReply) => {
    try {
        if(request.transfer){
            reply.redirect(`${process.env['HOMEPAGE']}${request.transfer}`)
        }else{
            reply.redirect(`${process.env['HOMEPAGE']}`)
        }

    } catch (e) {

        handleServerError(reply, e)
    }
}

export const passUrl = async (request: IAnyRequest, reply: FastifyReply) => {
    try {
        const {url} = request.query
        reply.redirect(url)
    } catch (e) {
        handleServerError(reply, e)
    }
}

export const apiMemoryRate = async (request: IAnyRequest, reply: FastifyReply) => {
    try {
        const used = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 1000) / 1000;
        reply.status(STANDARD.SUCCESS).send({"message": `The script uses approximately ${used} MB`})
    } catch (e) {
        handleServerError(reply, e)
    }
}

export const apiBriefingMail = async (request: IAnyRequest, reply: FastifyReply) => {
    try {

        const {user,title,content} = request.body;

        await sendBriefingMail(user, title, content).then(r=>{
            reply.status(STANDARD.SUCCESS).send({"message": `${MESSAGE.SUCCESS}`})
        }).catch(e=>{
            reply.status(ERROR404.statusCode).send(e.message)
        });

    } catch (e) {
        console.log(e)
        handleServerError(reply, e)
    }
}

export const signUp = async (request: IUserRequest, reply: FastifyReply) => {
    try {
        const {email/*, password, firstName, lastName*/} = request.body
        // const user = await prisma.user.findUnique({ where: { email: email } })
        // if (user) {
        //     reply.code(409).send(ERRORS.userExists)
        // }
        const hashPass = await utils.genSalt(10, email)
        const createUser =
            {
                email: email,
                password: String(hashPass),
            };

        const token = JWT.sign(
            {
                email: createUser.email,
            },
            process.env.APP_JWT_SECRET,
        )
        delete createUser.password
        reply.code(STANDARD.SUCCESS).send({
            token,
            user: createUser,
        })
    } catch (err) {
        handleServerError(reply, err)
    }
}

