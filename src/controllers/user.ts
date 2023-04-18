import axios, {AxiosRequestConfig, ResponseType} from 'axios';

const AXIOS_OPTIONS = {
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 5000,
};

export async function createUser(user: any): Promise<any> {
    try {
        const objParams = {
            division: user.division,
            account_id: user.email,
            name: user.name,
            sns_token: user.token,
            sns_type: user.type,
            phone_number: user.mobile.replace("-",""),
            account_type: 3,
            auth_level: 2,
        }
        const res = await axios.post(`${process.env['NEWS_API']}/User/ManagerSnsProcess`, objParams ,AXIOS_OPTIONS);

        return res.data;
    } catch (error) {
        console.log(error)
        return error;
    }
}
