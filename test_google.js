import translate from 'google-translate-api-x';

async function run() {
    try {
        const res = await translate('Hello world, I am translating this to Korean', { to: 'ko' });
        console.log(res.text);
    } catch (e) { console.error(e); }
}
run();
