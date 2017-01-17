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
const suffix = ";\nif (typeof module !== 'undefined'){module.exports = config;}";

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
        }
    },

    generateSecret: function(){
        var secret = crypto.randomBytes(128).toString('hex');
        var code = qrcode.image(JSON.stringify({
            port: config.port,
            host: this.mobile.config.ip ? this.mobile.config.ip : os.hostname(),
            token: secret
        }), {type: "png"});
        code.pipe(fs.createWriteStream("modules/MMM-Mobile/qr.png"));
        fs.writeFile("modules/MMM-Mobile/mobile.json", JSON.stringify(this.mobile, null, "\t"), "utf8", (err) => {
            if(err){
                console.log(this.name + ": Save settings failed!");
                return;
            }
            this.sendSocketNotification("SHOW_QR");
        });
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
                                var link = res[i].refs.fetch.split("/");
                                module.github_user = link[link.length - 2];
                                module.github_name = candidate;
                                module.github_url = "https://github.com/" + module.github_user + "/" +  module.github_name;
                                git.fetch().status((err, res) => {
                                    if(!err){
                                        module.status = {
                                            ahead: res.ahead,
                                            behind: res.behind,
                                            branch: res.current
                                        };
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
                fs.writeFile("modules/MMM-Mobile/mobile.json", JSON.stringify(this.mobile, null, "\t"), "utf8", (err) => {
                    if(err){
                        console.log(this.name + ": Save modules failed!");
                        return;
                    }
                    console.log(this.name + ": Saved modules!");
                });
            }
        });
    },

    appSocket: function(){
        var namespace = this.name + "/app";
        this.io.of(namespace).use((socket, next) => {
            var hash = crypto.createHash("sha256").update(socket.handshake.query.token).digest("base64");
            if(this.mobile.user && this.mobile.user === hash){
                console.log(this.name + ": Access granted!");
                next();
            } else {
                console.log(this.name + ": Authentication failed!");
                next(new Error("Authentication failed!"));
            }
        });
        this.io.of(namespace).on("connection", (socket) => {
            console.log(this.name + ": App connected!");
            socket.on("CONFIG", (data) => {
                console.log(this.name + ": Config requested!");
                socket.emit("CONFIG", config);
            });
            socket.on("INSTALLATIONS", (data) => {
                console.log(this.name + ": Modules requested!");
                socket.emit("INSTALLATIONS", this.mobile.modules);
            });
            socket.on("SYNC", (data) => {
                fs.rename("config/config.js", "config/config.js." + moment().format() + ".backup", (err) => {
                    if(err){
                        console.log(this.name + ": Sync failed!");
                        socket.emit("SYNC", {status: "SYNC_FAILED"});
                        return;
                    }
                    fs.writeFile("config/config.js", prefix + JSON.stringify(data, null, "\t") + suffix, "utf8", (err) => {
                        if(err){
                            console.log(this.name + ": Sync failed!");
                            socket.emit("SYNC", {status: "SYNC_FAILED"});
                            return;
                        }
                        console.log(this.name + ": Sync requested!");
                        socket.emit("SYNC", {status: "SUCCESSFULLY_SYNCED"});
                    });
                });
            });
        });
    }
});