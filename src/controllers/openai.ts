import axios from 'axios';


export async function generateChatMessage(query:string):Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    };

//택스트기반 봇 사용
    const text_davinci = {
        model: 'text-davinci-002',
        prompt: `${query} 키워드로 뉴스기사써줘`,
        temperature: 0.5,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    };

//gpt-3.5-turbo 봇 사용
    const gpt_turbo =
        {
        model: "gpt-3.5-turbo",
        max_tokens: 2048,
        //stream: true,
        messages:
            [
                {
                    role: "user",
                    content: `${query} 키워드로 뉴스기사작성해줘`
                },
            ],
       // responseType: 'stream'
        };


    try {
        const response = await axios.post(url, gpt_turbo, { headers });
        return response.data.choices[0].message;
    } catch (error) {
        console.error(error);
        return null;
    }
}
