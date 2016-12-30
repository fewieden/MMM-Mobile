/* Magic Mirror
 * Module: MMM-Mobile
 *
 * By fewieden https://github.com/fewieden/MMM-Mobile
 *
 * MIT Licensed.
 */

const fs = require("fs");
const config = require("../../../config/config.js");

if(fs.existsSync("../../config/config.js")) {
    var file = fs.readFileSync("../../config/config.js", "utf8");
    fs.writeFileSync("../../config/config.mobile_backup.js", file, "utf8");
}

config.modules.sort((a, b) => {
    if(!a.hasOwnProperty("position")){
        return -1;
    } else if(!b.hasOwnProperty("position")){
        return 1;
    } else if(a.position < b.position){
        return -1;
    } else if(a.position > b.position){
        return 1;
    } else {
        return 0;
    }
});

var file = "var config = " + JSON.stringify(config) + "; if(typeof module !== 'undefined'){module.exports = config;}";

fs.writeFileSync("../../config/config.js", file, "utf8");