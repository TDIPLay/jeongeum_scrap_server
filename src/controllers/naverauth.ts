import axios from 'axios';
import {KakaoAccessTokenResponse} from "../interfaces";

interface UserInfo {
  id: string;
  nickname: string;
  profileImage: string;
  email: string;
  mobile: string;
}

interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

async function getNaverAccessToken(clientId: string, clientSecret: string, redirectUri: string, code: string): Promise<KakaoAccessTokenResponse> {
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
  console.log("code: =>" + code)
  const tokens = await getNaverAccessToken(process.env["NAVER_CLIENT_ID"], process.env["NAVER_CLIENT_SECRET"],`${process.env.SOCIAL_POSTBACK}/naver`, code);

  if(tokens){
    return tokens;
  }else{
    return null;
  }
}

export async function validateNaverToken(accessToken: string): Promise<boolean> {
  try {

    if(!accessToken) return false;

    const verifyReqParams = {
      accessToken,
      client_id: process.env["NAVER_CLIENT_ID"],
      client_secret: process.env["NAVER_CLIENT_SECRET"],
    };
    const verifyRes = await axios.get<TokenInfo>(
        'https://nid.naver.com/oauth2.0/token/introspect',
        {
          params: verifyReqParams,
        },
    );

    // access token이 유효한 경우
    if (verifyRes.data) {
      console.log("토큰이 유효합니다!");
      return true;
    }

    // access token이 유효하지 않은 경우
    return false;
  } catch (error) {
    console.log("토큰이 유효하지 않습니다.");
    console.log(error.response.data);
    return false;
  }
}

export const getNaverUserInfo = async (accessToken: string) : Promise<any> => {
  const apiUrl = 'https://nid.naver.com/oauth2.0/token';

  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  try {
    const response = await axios.get(apiUrl, { headers });
    const {id,nickname, email, mobile,profileImage} = response.data.response;
    console.log(response.data.response)
    return {
      id: id,
      name: nickname,
      email: email,
      mobile: mobile,
      image: profileImage,
    };
  } catch (error) {
    console.error(error);
  }
};
