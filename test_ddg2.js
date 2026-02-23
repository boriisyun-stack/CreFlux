import { translate } from '@navetacandra/ddg';

async function run() {
    try {
        const results = await translate('translate hello to korean', { from: 'en', to: 'ko' });
        console.log(JSON.stringify(results, null, 2));
    } catch (e) { console.error(e); }
}
run();
