import axios from 'axios';

const OPENAI_API_KEY = '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';

export async function generateChatMessage(query:string):Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
    };
    const text_davinci = {
        model: 'text-davinci-002',
        prompt: `${query} 키워드로 기사 써줘`,
        temperature: 0.5,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    };

    const gpt_turbo = {
        model: "gpt-3.5-turbo",
        messages: [
            {"role": "system", "content": `${query}  키워드로 기사 써줘`},
        ]
    }


    try {
        const response = await axios.post(url, gpt_turbo, { headers });
        console.log(response.data.choices[0].message.content);
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error(error);
        return null;
    }
}
