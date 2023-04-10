import axios, {AxiosRequestConfig} from 'axios';
import Common_service from "../../service/common_service";
import service from "../../service/common_service";
import {hmsetRedis} from "./worker";
import {RKEYWORD} from "../helpers/common";

// 카카오톡 API를 호출할 때 필요한 인증 토큰
const ACCESS_TOKEN = 'X5m8-mV575fdhrqUV4YFn3uI2Xz1BpHASBrb5gVkCj11WgAAAYcsJDHs';

// KakaoTalk API 엔드포인트 URL
const KAKAO_TALK_API_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';
const KAKAO_OAUTH_API_URL = 'https://kauth.kakao.com/oauth/token';

interface KakaoAccessTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

// KakaoTalk 메시지 전송에 필요한 인터페이스 정의
export interface KakaoTalkMessage {
    object_type: 'text';
    text: string;
    link: {
        web_url: string,
        mobile_web_url: string
    },
    button_title: "바로 확인"
}

// KakaoTalk 메시지를 전송하는 함수
export async function sendKakaoTalkMessage(message: KakaoTalkMessage): Promise<void> {
    const config: AxiosRequestConfig = {
        method: 'post',
        url: KAKAO_TALK_API_URL,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${service.kakao_a_key?service.kakao_a_key:ACCESS_TOKEN}`,
        },
        data: `template_object=${encodeURIComponent(JSON.stringify(message))}`,
    };

    try {
        const response = await axios(config);
        console.log(response.data);
    } catch (error) {
        console.error(error.response.data);
    }
}

async function getKakaoAccessToken(clientId: string, clientSecret: string, redirectUri: string, code: string): Promise<string> {
    const config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
    };

    const data = {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
    };

    const response = await axios.post<KakaoAccessTokenResponse>(KAKAO_OAUTH_API_URL, data, config);
    console.log(response)
    return response.data.access_token;
}

//사용자 front 인증 사용 예시
//https://kauth.kakao.com/oauth/authorize?client_id=96f2967cf5c2dae1406caa81992e511f&response_type=code&redirect_uri=http://127.0.0.1:8080/tdi/talk/v1/oauth&scope=talk_message

export async function exampleUsage(code: string,userId :string): Promise<string> {
    console.log("code: =>" + code)
    const ACCESS_TOKEN = await getKakaoAccessToken(process.env.KAKAO_CLIENT_ID, '', process.env.KAKAO_AUTH_POST_URL, code);
    // const redisData = {[`${userId}`]: JSON.stringify([...newLinks, ...tempLinks])};
    // await hmsetRedis(redis, RKEYWORD, redisData, 0);
    console.log("ACCESS_TOKEN: =>" + ACCESS_TOKEN)
    return ACCESS_TOKEN;
}


