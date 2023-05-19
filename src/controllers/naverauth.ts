import axios from 'axios';
import {TokenResponse} from "../interfaces";


async function getNaverAccessToken(clientId: string, clientSecret: string, redirectUri: string, code: string): Promise<TokenResponse> {
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
        const response = await axios.post("https://nid.naver.com/oauth2.0/token", data, config);
        console.log(response.data)
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

export async function userNaverOAuth(code: string): Promise<any> {
    const tokens = await getNaverAccessToken(process.env["NAVER_CLIENT_ID"], process.env["NAVER_CLIENT_SECRET"], `${process.env.SOCIAL_POSTBACK}/naver`, code);

    if (tokens) {
        return tokens;
    } else {
        return null;
    }
}

export async function validateNaverToken(accessToken: string): Promise<boolean> {
    try {

        if (!accessToken) return false;

        const apiUrl = 'https://openapi.naver.com/v1/nid/me';

        const headers = {
            Authorization: `Bearer ${accessToken}`,
        };

        const response = await axios.get(apiUrl, {headers});
        if (response.data.response.id) {
            console.log("토큰이 유효합니다!");
            return true;
        } else {
            console.log("토큰이 유효하지 않습니다.");
            return false;
        }

    } catch (error) {
        console.log("토큰이 유효하지 않습니다.");
        console.log(error);
        return false;
    }
}

export const getNaverUserInfo = async (accessToken: string): Promise<any> => {
    const apiUrl = 'https://openapi.naver.com/v1/nid/me';

    const headers = {
        Authorization: `Bearer ${accessToken}`,
    };

    try {
        const response = await axios.get(apiUrl, {headers});
        const {id, name, email, mobile, profileImage} = response.data.response;
        return {
            id: id,
            name: name,
            email: email,
            mobile: mobile,
            image: profileImage,
        };
    } catch (error) {
        console.error(error);
    }
};
