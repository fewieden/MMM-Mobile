/* Magic Mirror
 * Module: MMM-Mobile
 *
 * By fewieden https://github.com/fewieden/MMM-Mobile
 *
 * MIT Licensed.
 */
const NodeHelper = require("node_helper");
const io = require("socket.io");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
const qrcode = require("qr-image");
const Git = require("simple-git");
const async = require("async");
const config = require("../../config/config.js");
const moment = require("moment");
const prefix = "var config = ";
const suffix = ";if (typeof module !== 'undefined'){module.exports = config;}";

module.exports = NodeHelper.create({

    mobile: {
        config: null,
        modules: [],
        user: null
    },

    start: function() {
        if(fs.existsSync("modules/MMM-Mobile/mobile.json")){
            this.mobile = JSON.parse(fs.readFileSync("modules/MMM-Mobile/mobile.json", "utf8"));
        } else {
            this.mobile.user = this.generateSecret();
            fs.writeFileSync("modules/MMM-Mobile/mobile.json", JSON.stringify(this.mobile), "utf8");
        }

        this.appSocket();
        this.getModules();
        setInterval(() => {
            this.getModules();
        }, 15*60*1000);
    },

    socketNotificationReceived: function(notification, payload) {
        if(notification === "CONFIG"){
            this.mobile.config = payload;
            if(this.qr){
                this.sendSocketNotification("SHOW_QR");
            }
        } else if(notification === "CREATE_QR"){
            if(this.qr){
                this.sendSocketNotification("SHOW_QR");
            }
        }
    },

    generateSecret: function(){
        var secret = crypto.randomBytes(128).toString('hex');
        var code = qrcode.image(JSON.stringify({
            port: config.port,
            host: os.hostname(),
            token: secret
        }), {type: "png"});
        code.pipe(fs.createWriteStream("modules/MMM-Mobileqr.png"));
        this.qr = true;
        return crypto.createHash("sha256").update(secret).digest("base64");
    },

    getModules: function(){
        var candidates = fs.readdirSync("modules");
        var ignore = ["node_modules", "default"];
        var modules = [];
        async.each(candidates, (candidate, callback) => {
            if(ignore.indexOf(candidate) === -1 && fs.lstatSync("modules/"+candidate).isDirectory()){
                var module = {
                    name: candidate.replace(/^MMM-/i, "").replace(/^MM-/i, ""),
                    installed: true,
                    image: ""
                };
                var git = Git("modules/" + candidate);
                git.getRemotes(true, (err, res) => {
                    if(!err){
                        for(var i = 0; i < res.length; i++){
                            if(res[i].name === "origin"){
                                var link = res[i].refs.fetch;
                                module.github_url = link.slice(0,-4);
                                module.github_name = candidate;
                                link = link.split("/");
                                module.github_user = link[link.length - 2];
                                git.fetch().status((err, res) => {
                                    if(!err){
                                        module.status = res;
                                        modules.push(module);
                                    }
                                    callback();
                                });
                                break;
                            }
                        }
                    } else {
                        callback();
                    }
                });
            } else {
                callback();
            }
        }, (err) => {
            if(err){
                console.log(err);
            } else {
                modules.sort((a, b) => {
                    var name = a.name.toLowerCase();
                    var name2 = b.name.toLowerCase();
                    if(name < name2){
                        return -1;
                    } else if(name >name2){
                        return 1;
                    } else {
                        return 0;
                    }
                });
                this.mobile.modules = modules;
                fs.writeFileSync("modules/MMM-Mobile/mobile.json", JSON.stringify(this.mobile), "utf8");
            }
        });
    },

    appSocket: function(){
        var namespace = this.name + "/app";
        this.io.of(namespace).use((socket, next) => {
            var hash = crypto.createHash("sha256").update(socket.handshake.query.token).digest("base64");
            if(this.mobile.user && this.mobile.user === hash){
                next();
            } else {
                next(new Error("Authentication failed!"));
            }
        });
        this.io.of(namespace).on("connection", (socket) => {
            socket.on("CONFIG", (data) => {
                socket.emit("CONNECT", config);
            });
            socket.on("INSTALLATIONS", (data) => {
                socket.emit("INSTALLATIONS", this.mobile.modules);
            });
            socket.on("SYNC", (data) => {
                fs.renameSync("config/config.js", "config/config.js." + moment().format() + ".backup");
                fs.writeFileSync("config/config.js", prefix + JSON.stringify(data) + suffix, "utf8");
                socket.emit("SYNC", {status: "SUCCESSFULLY_SYNCED"});
            });
        });
    }

});
