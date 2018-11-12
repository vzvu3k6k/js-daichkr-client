/* eslint import/no-extraneous-dependencies: ["error", { "devDependencies": true }] */
import ToughCookieFileStore from 'tough-cookie-file-store';
import fs from 'fs';
import path from 'path';
import DaichkrClient from '../src/';
import hatenaId from '../test/secrets/hatenaId.json';

const jarPath = path.resolve(__dirname, '../test/secrets/logined.jar');
if (!fs.existsSync(jarPath)) {
  fs.writeFileSync(jarPath, '');
}
const jar = new ToughCookieFileStore(jarPath);
const client = new DaichkrClient({ jar });
client.loginWithHatenaId(hatenaId.username, hatenaId.password)
  .then(
    /* eslint-disable no-console */
    () => { console.log('ok'); },
    (err) => { console.log(err.stack); },
    /* eslint-enable no-console */
  );
