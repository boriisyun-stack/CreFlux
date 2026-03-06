import { OpenAI } from 'openai';

const openai = new OpenAI({
    baseURL: 'https://text.pollinations.ai/openai',
    apiKey: 'dummy'
});

async function main() {
    const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: 'Say hello!' }],
        model: 'openai',
    });
    console.log(completion.choices[0].message.content);
}
main();
