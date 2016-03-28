import DaichkrClient from '../src/';
import ToughCookieFilestore from 'tough-cookie-filestore';
import hatenaId from '../test/secrets/hatenaId.json';
import path from 'path';

const jar = new ToughCookieFilestore(path.resolve(__dirname, '../test/secrets/logined.jar'));

const client = new DaichkrClient({ jar });
client.loginWithHatenaId(hatenaId.username, hatenaId.password)
  .then(
    /* eslint-disable no-console */
    () => { console.log('ok'); },
    (err) => { console.log(err.stack); }
    /* eslint-enable no-console */
  );
