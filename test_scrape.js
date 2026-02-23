import { search } from 'duck-duck-scrape';
async function run() {
  try {
    const results = await search('translate hello to korean');
    console.log(JSON.stringify(results, null, 2));
  } catch (e) { console.error(e); }
}
run();
