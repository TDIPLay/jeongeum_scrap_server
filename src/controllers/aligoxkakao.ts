import aligoapi from 'aligoapi';
import {News} from "../interfaces";

interface AuthData {
    apikey: string;
    userid: string;
}

const AuthData: AuthData = {
    apikey: '<apikey>',
    userid: '<userid>',
};

const token = (req, res) => {
    // 토큰 생성

    // req.body = {
    /*** 필수값입니다 ***/
    // type: 유효시간 타입 코드 // y(년), m(월), d(일), h(시), i(분), s(초)
    // time: 유효시간
    /*** 필수값입니다 ***/
    // }
    // req.body 요청값 예시입니다.

    aligoapi.token(req, AuthData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

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

    aligoapi.profileAuth(req, AuthData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const profileCategory = (req, res) => {
    // 플러스친구 - 카테고리 조회

    aligoapi.profileCategory(req, AuthData)
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

    aligoapi.profileAdd(req, AuthData)
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

    aligoapi.friendList(req, AuthData)
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

    aligoapi.templateList(req, AuthData)
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

    aligoapi.templateAdd(req, AuthData)
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

    aligoapi.templateModify(req, AuthData)
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

    aligoapi.templateDel(req, AuthData)
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

    aligoapi.templateRequest(req, AuthData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const alimtalkSend = (req, res) => {
    // 알림톡 전송

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

    aligoapi.alimtalkSend(req, AuthData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
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

    aligoapi.historyList(req, AuthData)
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
    aligoapi.historyDetail(req, AuthData)
        .then((r) => {
            res.send(r)
        })
        .catch((e) => {
            res.send(e)
        })
}

const kakaoRemain = (req, res) => {
    // 발송가능건수
    aligoapi.kakaoRemain(req, AuthData)
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

    aligoapi.kakaoCancel(req, AuthData)
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

        return {
            "imageUrl": item.thumbnail,
            "altText": title,
            "link": {
                "web": item.link
            },
            "contents": [
                {
                    "type": "text",
                    "text": title,
                    "weight": "bold",
                    "size": "md",
                    "wrap": true
                },
                {
                    "type": "text",
                    "text": `${company} | ${item.pubDate}`,
                    "size": "sm",
                    "color": "#aaaaaa",
                    "wrap": true
                },
                {
                    "type": "text",
                    "text": description,
                    "size": "sm",
                    "color": "#555555",
                    "wrap": true
                }
            ]
        };
    });

    return {
        "template": {
            "outputs": [
                {
                    "simpleImage": {
                        "imageUrl": "https://i.ibb.co/cD19xzt/news-header.png",
                        "altText": "오늘의 뉴스"
                    }
                },
                {
                    "carousel": {
                        "type": "basicCard",
                        "items": template
                    }
                }
            ]
        }
    };
};
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