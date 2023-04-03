import {FastifyReply} from "fastify"
import {STANDARD} from "../helpers/constants"
import {handleServerError} from "../helpers/errors"
import service from '../../service/common_service'
import {IAnyRequest, IUserRequest} from "../interfaces";
import * as JWT from 'jsonwebtoken'
import {utils} from "../helpers/utils";
import {exampleUsage} from "./kakaotalk";
import Common_service from "../../service/common_service";


export const apiSyncUp = async (request: IAnyRequest, reply: FastifyReply) => {
    try {
        reply.status(STANDARD.SUCCESS).send(request.transfer)
    } catch (e) {
        handleServerError(reply, e)
    }
}

export const apiDef = async (request: IAnyRequest, reply: FastifyReply) => {
    try {
        const {code} = request.query
        service.kakao_a_key = await exampleUsage(code);
        reply.status(STANDARD.SUCCESS).send(service.kakao_a_key)
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

