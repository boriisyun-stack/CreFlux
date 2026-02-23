import { translate } from 'bing-translate-api';
translate('Translate this to Korean', null, 'ko').then(res => {
  console.log(res.translation);
}).catch(err => {
  console.error(err);
});
