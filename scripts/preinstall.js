/* Magic Mirror
 * Module: MMM-Mobile
 *
 * By fewieden https://github.com/fewieden/MMM-Mobile
 *
 * MIT Licensed.
 */

/* eslint-env node */

const fs = require('fs');
const config = require('../../../config/config.js');

if (fs.existsSync('../../config/config.js')) {
    const file = fs.readFileSync('../../config/config.js', 'utf8');
    console.log('Creating Backup for config.js!');
    fs.writeFileSync('../../config/config.mobile_backup.js', file, 'utf8');
}

config.modules.sort((a, b) => {
    if (!Object.prototype.hasOwnProperty.call(a, 'position')) {
        return -1;
    } else if (!Object.prototype.hasOwnProperty.call(b, 'position')) {
        return 1;
    } else if (a.position < b.position) {
        return -1;
    } else if (a.position > b.position) {
        return 1;
    }
    return 0;
});

const file = `var config = ${JSON.stringify(config, null, '\t')};\nif(typeof module !== 'undefined'){module.exports = config;}`;

console.log('Saving updated config.js!');
fs.writeFileSync('../../config/config.js', file, 'utf8');
