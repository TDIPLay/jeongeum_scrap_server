import {Credentials, OAuth2Client} from 'google-auth-library';
import { google } from 'googleapis';

interface UserInfo {
    id: string;
    name: string;
    email: string;
    picture: string;
}


// Google OAuth2 인증

// 로그인 페이지로 이동하는 함수
export const loginWithGoogle = (): string => {
    const REDIRECT_URI = `${process.env.SOCIAL_POSTBACK}/google`;
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, REDIRECT_URI);
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['email', 'profile'],
        redirect_uri: REDIRECT_URI,
    });
    return url;
};

// 콜백 함수에서 토큰을 받아오는 함수
export const userGoogleOAuth = async (code: string): Promise<Credentials> => {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${process.env.SOCIAL_POSTBACK}/google`);

    const { tokens } = await client.getToken(code);
    console.log("tokens")
    console.log(tokens)
    return tokens;
};



// 유저 정보를 가져오는 함수
export const getGoogleUserInfo = async (accessToken: string): Promise<any> => {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${process.env.SOCIAL_POSTBACK}/google`);
    // Google OAuth2 클라이언트 설정
        client.setCredentials({ access_token: accessToken });

    // 구글 API 클라이언트 생성
    const googleClient = google.people({ version: 'v1', auth: client });

    // 구글 API 호출
    const { data } = await googleClient.people.get({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses',
    });
    console.log(data)
    // 필요한 유저 정보를 추출하여 반환
    return {
        name: data.names?.[0].displayName,
        email: data.emailAddresses?.[0].value,
    };
};


export async function validateGoogleToken(accessToken: string): Promise<boolean> {
   /* const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, `${process.env.SOCIAL_POSTBACK}/google`);

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });

        const payload = ticket.getPayload();

        // 체크하고자 하는 토큰에 대한 정보
        const userEmail = payload?.email;
        const userFullName = payload?.name;*/
    try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${process.env.SOCIAL_POSTBACK}/google`);
    // Google OAuth2 클라이언트 설정
    client.setCredentials({ access_token: accessToken });

    // 구글 API 클라이언트 생성
    const googleClient = google.people({ version: 'v1', auth: client });

    // 구글 API 호출
    const { data } = await googleClient.people.get({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses',
    });
        return true; // 토큰이 유효한 경우
    } catch (error) {
        console.error(error);
        return false; // 토큰이 유효하지 않은 경우
    }
}
