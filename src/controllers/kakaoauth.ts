import axios, {AxiosRequestConfig} from 'axios';
import Common_service from "../../service/common_service";
import service from "../../service/common_service";
import {hmsetRedis} from "./worker";
import {RKEYWORD, RTOTEN} from "../helpers/common";
import {getRedis} from "../../service/redis";
import {KakaoAccessTokenResponse} from "../interfaces";

// 카카오톡 API를 호출할 때 필요한 인증 토큰
const ACCESS_TOKEN = 'X5m8-mV575fdhrqUV4YFn3uI2Xz1BpHASBrb5gVkCj11WgAAAYcsJDHs';

// KakaoTalk API 엔드포인트 URL
const KAKAO_TALK_API_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';
const KAKAO_OAUTH_API_URL = 'https://kauth.kakao.com/oauth/token';


// KakaoTalk 메시지 전송에 필요한 인터페이스 정의
export interface KakaoTalkMessage {
    object_type: string;
    text: string;
    link: {
        web_url: string,
        mobile_web_url: string
    },
    button_title: string
}

interface UserInfoResponse {
    id: number;
    properties: {
        nickname: string;
        profile_image?: string;
        thumbnail_image?: string;
    };
    kakao_account: {
        profile_nickname_needs_agreement: boolean;
        profile_needs_agreement: boolean;
        profile: {
            nickname: string;
            thumbnail_image_url?: string;
            profile_image_url?: string;
            is_default_image?: boolean;
        };
        email_needs_agreement: boolean;
        has_email: boolean;
        email: string;
        is_email_valid?: boolean;
        is_email_verified: boolean;
        has_age_range?: boolean;
        age_range_needs_agreement?: boolean;
        age_range?: string;
        has_birthday?: boolean;
        birthday_needs_agreement?: boolean;
        birthday?: string;
        birthday_type?: string;
        has_gender?: boolean;
        gender_needs_agreement?: boolean;
        gender?: string;
    };
}


// KakaoTalk 메시지를 전송하는 함수
export async function sendKakaoTalkMessage(access_token:string,message: KakaoTalkMessage): Promise<void> {
    const config: AxiosRequestConfig = {
        method: 'post',
        url: KAKAO_TALK_API_URL,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${access_token}`,
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

async function getKakaoAccessToken(clientId: string, clientSecret: string, redirectUri: string, code: string): Promise<KakaoAccessTokenResponse> {
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

    try {
        const response = await axios.post(KAKAO_OAUTH_API_URL, data, config);
        console.log(response.data)
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

//사용자 front 인증 사용 예시
//https://kauth.kakao.com/oauth/authorize?client_id=96f2967cf5c2dae1406caa81992e511f&response_type=code&redirect_uri=http://192.168.56.1:8080/tdi/talk/v1/oauth&scope=talk_message&state=test

export async function userKakaoOAuth(code: string): Promise<any> {
    console.log("code: =>" + code)
    const tokens = await getKakaoAccessToken(process.env["KAKAO_CLIENT_ID"], '',`${process.env.SOCIAL_POSTBACK}/kakao`, code);

    if(tokens){
        return tokens;
    }else{
        return null;
    }
}


export const getKakaoUserInfo = async (accessToken: string) : Promise<any> => {
    const apiUrl = 'https://kapi.kakao.com/v2/user/me';

    const headers = {
        Authorization: `Bearer ${accessToken}`,
    };

    try {
        const response = await axios.get(apiUrl, { headers });
        const {id, kakao_account: {profile: {nickname}, email}} =  response.data;

        return {
            id: id,
            name: nickname,
            email: email,
            mobile: '',
            image: ''
        };
    } catch (error) {
        console.error(error);
    }
};

export async function validateKakaoToken(accessToken: string): Promise<boolean> {
    try {

        if(!accessToken) return false;

        const response = await axios.get("https://kapi.kakao.com/v1/user/access_token_info", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        console.log("토큰이 유효합니다!");
        console.log(response.data);
        return true;
    } catch (error) {
        console.log("토큰이 유효하지 않습니다.");
        console.log(error.response.data);
        return false;
    }
}



