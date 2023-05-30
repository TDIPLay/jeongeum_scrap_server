import aligoapi from 'aligoapi';
import {News, TalkUser} from "../interfaces";
import axios from "axios";
import {hgetData} from "./worker";
import {R_ALIGO_TOTEN, R_CAFE_KEYWORD} from "../helpers/common";
import {getRedis} from "../../service/redis";

interface AuthData {
    apikey: string;
    userid: string;
    token: string;
}

const authData: AuthData = {
    apikey: '8qf76e7v8cxlgqmjxfjza3iyj5tyj0u1',
    userid: 'tdi9',
    token: ''
};

const token = async (req) => {
    // 토큰 생성
    req.body = {
        type: 'y', // 유효시간 타입 코드 // y(년), m(월), d(일), h(시), i(분), s(초)
        time: 10, // 유효시간
    };
    const api_url = 'https://kakaoapi.aligo.in/akv10/token/create/10/y/'; // JSON 결과
    authData.token =  await hgetData(await getRedis(), R_ALIGO_TOTEN, "", process.env["ALIGO_REG_HOST"]);

    const params = new URLSearchParams();
    params.append('apikey', authData.apikey);
    params.append('userid', authData.userid);
    console.log(params);

    try {
        const response = await axios.post(api_url, params);
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const profileAuth = (req, res) => {
    // 플러스친구 - 인증요청

    // req.body = {
    /*** 필수값입니다 ***/
    // plusid: 플러스친구 아이디(@포함)
    // phonenumber: 관리자 핸드폰 번호
    /*** 필수값입니다 ***/
    // }
    // req.body 요청값 예시입니다.
    // phonenumber로 인증번호가 발송됩니다

    aligoapi.profileAuth(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const profileCategory = (req, res) => {
    // 플러스친구 - 카테고리 조회

    aligoapi.profileCategory(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const profileAdd = (req, res) => {
    // 플러스친구 - 친구등록 심사요청

    // req.body = {
    /*** 필수값입니다 ***/
    // plusid: 플러스친구 아이디(@포함)
    // authnum: 인증번호
    // phonenumber: 관리자 핸드폰 번호
    // categorycode: 카테고리 코드
    /*** 필수값입니다 ***/
    // }
    // req.body 요청값 예시입니다.
    // 플러스친구 - 인증요청의 phonenumber로 발송된 인증번호를 authnum값으로 보내세요
    // 플러스친구 - 카테고리 조회의 thirdBusinessType 값을 categorycode값으로 보내세요

    aligoapi.profileAdd(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const friendList = (req, res) => {
    // 플러스친구 - 등록된 플러스친구 리스트

    // req.body = {
    // plusid: 플러스친구 아이디(@ 포함)
    // senderkey: 발신프로필 키
    // }
    // req.body 요청값 예시입니다.

    aligoapi.friendList(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const templateList = (req, res) => {
    // 템플릿관리 - 템플릿 리스트

    // req.body = {
    /*** 필수값입니다 ***/
    // senderkey: 발신프로필 키
    /*** 필수값입니다 ***/
    // tpl_code: 템플릿 코드
    // }
    // req.body 요청값 예시입니다.

    aligoapi.templateList(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const templateAdd = (req, res) => {
    // 템플릿관리 - 템플릿 등록

    // req.body = {
    /*** 필수값입니다 ***/
    // senderkey: 발신프로필 키
    // tpl_name: 템플릿 이름
    // tpl_content: 템플릿 내용 // (최대 1,000자)
    /*** 필수값입니다 ***/
    // tpl_button: 템플릿 버튼
    // }
    // req.body 요청값 예시입니다.

    aligoapi.templateAdd(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const templateModify = (req, res) => {
    // 템플릿관리 - 템플릿 수정

    // req.body = {
    /*** 필수값입니다 ***/
    // senderkey: 발신프로필 키
    // tpl_code: 템플릿 코드
    // tpl_name: 템플릿 이름
    // tpl_content: 템플릿 내용 // (최대 1,000자)
    /*** 필수값입니다 ***/
    // tpl_button: 템플릿 버튼
    // }
    // req.body 요청값 예시입니다.

    aligoapi.templateModify(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const templateDel = (req, res) => {
    // 템플릿관리 - 템플릿 삭제

    // req.body = {
    /*** 필수값입니다 ***/
    // senderkey: 발신프로필 키
    // tpl_code: 템플릿 코드
    /*** 필수값입니다 ***/
    // }
    // req.body 요청값 예시입니다.

    aligoapi.templateDel(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const templateRequest = (req, res) => {
    // 템플릿관리 - 템플릿 검수요청

    // req.body = {
    /*** 필수값입니다 ***/
    // senderkey: 발신프로필 키
    // tpl_code: 템플릿 코드
    /*** 필수값입니다 ***/
    // }
    // req.body 요청값 예시입니다.

    aligoapi.templateRequest(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const alimtalkSend = async (obj:TalkUser) => {
    // req.body = {
    /*** 필수값입니다 ***/
    // senderkey: 발신프로필 키
    // tpl_code: 템플릿 코드
    // sender: 발신자 연락처
    // receiver_1: 수신자 연락처
    // subject_1: 알림톡 제목
    // message_1: 알림톡 내용
    /*** 필수값입니다 ***/
    // senddate: 예약일 // YYYYMMDDHHMMSS
    // recvname: 수신자 이름
    // button: 버튼 정보 // JSON string
    // failover: 실패시 대체문자 전송기능 // Y or N
    // fsubject: 실패시 대체문자 제목
    // fmessage: 실패시 대체문자 내용
    // }
    // req.body 요청값 예시입니다.
    // _로 넘버링된 최대 500개의 receiver, subject, message, button, fsubject, fmessage 값을 보내실 수 있습니다
    // failover값이 Y일때 fsubject와 fmessage값은 필수입니다.

    const api_url = 'https://kakaoapi.aligo.in/akv10/alimtalk/send/'; // JSON 결과
    authData.token =  await hgetData(await getRedis(), R_ALIGO_TOTEN, "", process.env["ALIGO_REG_HOST"]);
    const params = new URLSearchParams();
    params.append('apikey', authData.apikey);
    params.append('userid', authData.userid);
    params.append('token', authData.token);
    params.append('senderkey', obj.senderkey);
    params.append('tpl_code', obj.tpl_code);
    params.append('sender', obj.sender);
    params.append('receiver_1', obj.receiver_1);
    params.append('subject_1', obj.subject_1);
    params.append('emtitle_1', obj.emtitle_1);
    params.append('message_1', obj.message_1 );
    params.append('failover', obj.failover);
    params.append('fsubject_1', obj.fsubject_1);
    params.append('fmessage_1', obj.fmessage_1);
    params.append('button_1', JSON.stringify(obj.button_1));
    try {
        const response = await axios.post(api_url, params);
        return response.data;
    } catch (error) {
        console.log(error)
        throw error;
    }
}

const historyList = (req, res) => {
    // 전송결과보기

    // req.body = {
    // page: 페이지번호 // 기본1
    // limit: 페이지당 출력 갯수 // (기본 50) 최대 500
    // start_date: 조회시작일자 // 기본 최근일자 // YYYYMMDD
    // enddate: 조회마감일자 // YYYYMMDD
    // }
    // req.body 요청값 예시입니다.

    aligoapi.historyList(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const historyDetail = (req, res) => {
    // 전송결과보기 상세

    // req.body = {
    /*** 필수값입니다 ***/
    // mid: 메세지 고유ID
    /*** 필수값입니다 ***/
    // page: 페이지번호 // 기본1
    // limit: 페이지당 출력 갯수 // (기본 50) 최대 500
    // start_date: 조회시작일자 // 기본 최근일자 // YYYYMMDD
    // enddate: 조회마감일자 // YYYYMMDD
    // }
    // req.body 요청값 예시입니다.
    aligoapi.historyDetail(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const kakaoRemain = (req, res) => {
    // 발송가능건수
    aligoapi.kakaoRemain(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const kakaoCancel = (req, res) => {
    // 예약취소

    // req.body = {
    /*** 필수값입니다 ***/
    // mid: 메세지 고유ID
    /*** 필수값입니다 ***/
    // }
    // req.body 요청값 예시입니다.

    aligoapi.kakaoCancel(req, authData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const generateTalkTemplate = (data: News[]) => {
    const template = data.map((item) => {
        const title = item.title ? item.title.replace(/"/g, "`") : "";
        const description = item.description ? item.description.replace(/"/g, "`") : "";
        const company = item.company ? item.company.replace(/"/g, "`") : "";

        return `
        ▶ title: ${title}
        ▶ link : ${item.link}
        ▶ press|author|data : ${company} | ${item.author} | ${item.pubDate}
        `;
    }).join("");
    return `${template}`
};

async function sendAlimTalk() {
    try {
        const articles = [
            {
                title: '4월 호텔 톱5, ‘그랜드워커힐’ 홀로 선전',
                link: 'https://n.news.naver.com/mnews/article/022/0003810737?sid=101',
            },
            {
                title: '4월 호텔 톱5, ‘그랜드워커힐’ 홀로 선전',
                link: 'https://n.news.naver.com/mnews/article/022/0003810737?sid=101',
            },
            {
                title: '4월 호텔 톱5, ‘그랜드워커힐’ 홀로 선전',
                link: 'https://n.news.naver.com/mnews/article/022/0003810737?sid=101',
            },
            {
                title: '4월 호텔 톱5, ‘그랜드워커힐’ 홀로 선전',
                link: 'https://n.news.naver.com/mnews/article/022/0003810737?sid=101',
            }
        ];

        // 템플릿 내용 생성
        const templateContent = articles.map((article, index) => {
            return `[기사 ${index + 1}]\n제목: ${article.title}\n링크: ${article.link}\n`;
        }).join('\n');

        return templateContent;
    } catch (e) {

    }
}

export {
    token,
    friendList,
    profileAuth,
    profileCategory,
    profileAdd,
    templateList,
    templateAdd,
    templateModify,
    templateDel,
    templateRequest,
    alimtalkSend,
    historyList,
    historyDetail,
    kakaoRemain,
    kakaoCancel,
    generateTalkTemplate
}
