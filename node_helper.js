/* Magic Mirror
 * Module: MMM-Mobile
 *
 * By fewieden https://github.com/fewieden/MMM-Mobile
 *
 * MIT Licensed.
 */

/* eslint-env node */

const NodeHelper = require('node_helper');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const qrcode = require('qr-image');
const Git = require('simple-git');
const async = require('async');
const config = require('../../config/config.js');
const moment = require('moment');
const exec = require('child_process').exec;

const prefix = 'var config = ';
const suffix = ';\nif (typeof module !== \'undefined\'){module.exports = config;}';

module.exports = NodeHelper.create({

    mobile: {
        config: null,
        modules: [],
        user: null
    },

    start() {
        console.log(`Starting module helper: ${this.name}`);
        if (fs.existsSync('modules/MMM-Mobile/mobile.json')) {
            this.mobile = JSON.parse(fs.readFileSync('modules/MMM-Mobile/mobile.json', 'utf8'));
        }

        this.appSocket();
        this.getModules();
        setInterval(() => {
            this.getModules();
        }, 15 * 60 * 1000);
    },

    socketNotificationReceived(notification, payload) {
        if (notification === 'CONFIG') {
            this.mobile.config = payload;
            if (!Object.prototype.hasOwnProperty.call(this.mobile, 'user') || this.mobile.user == null) {
                this.generateSecret();
            } else {
                this.sendSocketNotification('SHOW_QR');
            }
        }
    },

    generateSecret() {
        const secret = crypto.randomBytes(128).toString('hex');
        const code = qrcode.image(JSON.stringify({
            port: config.port,
            host: this.mobile.config.ip ? this.mobile.config.ip : os.hostname(),
            token: secret
        }), { type: 'png' });
        code.pipe(fs.createWriteStream('modules/MMM-Mobile/qr.png'));
        this.mobile.user = crypto.createHash('sha256').update(secret).digest('base64');
        fs.writeFile('modules/MMM-Mobile/mobile.json', JSON.stringify(this.mobile, null, '\t'), 'utf8', (err) => {
            if (err) {
                console.log(`${this.name}: Save settings failed!`);
                return;
            }
            this.sendSocketNotification('SHOW_QR');
        });
    },

    getModules() {
        const candidates = fs.readdirSync('modules');
        const ignore = ['node_modules', 'default'];
        const modules = [];

        // eslint-disable-next-line global-require
        const defaultmodules = require('../default/defaultmodules.js');

        // eslint-disable-next-line global-require
        const calendarConfig = require('../MMM-Mobile/configuration.js');

        for (let i = 0; i < defaultmodules.length; i += 1) {
            const module = {
                name: defaultmodules[i],
                github_name: defaultmodules[i],
                github_user: 'MagicMirror',
                installed: true,
                image: ''
            };
            if (module.github_name === 'calendar') {
                module.config = calendarConfig;
            }
            modules.push(module);
        }

        async.each(candidates, (candidate, callback) => {
            if (ignore.indexOf(candidate) === -1 && fs.lstatSync(`modules/${candidate}`).isDirectory()) {
                const module = {
                    name: candidate.replace(/^MMM-/i, '').replace(/^MM-/i, ''),
                    installed: true,
                    image: ''
                };
                const git = Git(`modules/${candidate}`);
                git.getRemotes(true, (error, result) => {
                    if (!error) {
                        for (let i = 0; i < result.length; i += 1) {
                            if (result[i].name === 'origin') {
                                const link = result[i].refs.fetch.split('/');
                                module.github_user = link[link.length - 2];
                                module.github_name = candidate;
                                module.github_url = `https://github.com/${module.github_user}/${module.github_name}`;
                                git.fetch().status((err, res) => {
                                    if (!err) {
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
        }, (error) => {
            if (error) {
                console.log(error);
            } else {
                modules.sort((a, b) => {
                    const name = a.name.toLowerCase();
                    const name2 = b.name.toLowerCase();
                    if (name < name2) {
                        return -1;
                    } else if (name > name2) {
                        return 1;
                    }
                    return 0;
                });
                this.mobile.modules = modules;
                fs.writeFile('modules/MMM-Mobile/mobile.json', JSON.stringify(this.mobile, null, '\t'), 'utf8', (err) => {
                    if (err) {
                        console.log(`${this.name}: Save modules failed!`);
                        return;
                    }
                    console.log(`${this.name}: Saved modules!`);
                });
            }
        });
    },

    appSocket() {
        const namespace = `${this.name}/app`;

        this.io.of(namespace).use((socket, next) => {
            const hash = crypto.createHash('sha256').update(socket.handshake.query.token).digest('base64');
            if (this.mobile.user && this.mobile.user === hash) {
                console.log(`${this.name}: Access granted!`);
                next();
            } else {
                console.log(`${this.name}: Authentication failed!`);
                next(new Error('Authentication failed!'));
            }
        });

        this.io.of(namespace).on('connection', (socket) => {
            console.log(`${this.name}: App connected!`);

            socket.on('CONFIG', () => {
                console.log(`${this.name}: Config requested!`);
                socket.emit('CONFIG', config);
            });

            socket.on('INSTALLATIONS', () => {
                console.log(`${this.name}: Modules requested!`);
                socket.emit('INSTALLATIONS', this.mobile.modules);
            });

            socket.on('INSTALL_MODULE', (data) => {
                this.installModule(socket, data);
            });

            socket.on('UPDATE_MODULE', (data) => {
                this.updateModule(socket, data);
            });

            socket.on('INSTALL_MODULE_DEPENDENCIES', (data) => {
                this.installModuleDependencies(socket, data);
            });

            socket.on('SYNC', (data) => {
                this.sync(socket, data);
            });

            socket.on('RESTART_MIRROR', () => {
                socket.emit('RESTART_MIRROR', { status: 'WILL_BE_RESTARTED' });
                exec('pm2 restart mm', (error) => {
                    if (error) {
                        console.log(`${this.name}: Restarting mirror failed!`);
                    }
                });
            });

            socket.on('SHOW_MODULES', () => {
                console.log(`${this.name}: Showing modules!`);
                this.sendSocketNotification('SHOW_MODULES');
            });

            socket.on('HIDE_MODULES', () => {
                console.log(`${this.name}: Hiding modules!`);
                this.sendSocketNotification('HIDE_MODULES');
            });
        });
    },

    installModule(socket, data) {
        Git('modules').clone(data.url, data.name, (error) => {
            this.requestResponse(socket, 'INSTALL_MODULE', error);
        });
    },

    updateModule(socket, data) {
        Git(`modules/${data.name}`).pull((error) => {
            this.requestResponse(socket, 'UPDATE_MODULE', error);
        });
    },

    requestResponse(socket, msg, error) {
        if (error) {
            console.log(`${this.name}: ${msg} failed!`);
            socket.emit(msg, { error });
        } else {
            this.getModules();
            console.log(`${this.name}: ${msg} successfully!`);
            socket.emit(msg, { status: 'success' });
        }
    },

    installModuleDependencies(socket, data) {
        if (fs.existsSync(`modules/${data.name}/package.json`)) {
            // eslint-disable-next-line global-require, import/no-dynamic-require
            const pack = require(`../${data.name}/package.json`);
            exec('npm install', { cwd: `modules/${data.name}` }, (error) => {
                if (error) {
                    this.installModuleDependenciesFail(socket, error);
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(pack, 'scripts') &&
                    Object.prototype.hasOwnProperty.call(pack.scripts, 'module_dependencies')) {
                    exec('npm run module_dependencies', { cwd: `modules/${data.name}` }, (err) => {
                        if (err) {
                            this.installModuleDependenciesFail(socket, err);
                        } else {
                            this.installModuleDependenciesSuccess(socket);
                        }
                    });
                } else {
                    this.installModuleDependenciesSuccess(socket);
                }
            });
        } else {
            this.installModuleDependenciesFail(socket, 'NO_DEPENDENCIES_DEFINED');
        }
    },

    installModuleDependenciesSuccess(socket) {
        console.log(`${this.name}: Installed module dependencies successfully!`);
        socket.emit('INSTALL_MODULE_DEPENDENCIES', { status: 'success' });
    },

    installModuleDependenciesFail(socket, error) {
        console.log(`${this.name}: Install module dependencies failed!`);
        socket.emit('INSTALL_MODULE_DEPENDENCIES', { error });
    },

    sync(socket, data) {
        fs.rename('config/config.js', `config/config.js.${moment().format()}.backup`, (err) => {
            if (err) {
                this.syncFailed(socket);
                return;
            }
            fs.writeFile('config/config.js', prefix + JSON.stringify(data, null, '\t') + suffix, 'utf8', (error) => {
                if (error) {
                    this.syncFailed(socket);
                } else {
                    console.log(`${this.name}: Sync requested!`);
                    socket.emit('SYNC', { status: 'SUCCESSFULLY_SYNCED' });
                }
            });
        });
    },

    syncFailed(socket) {
        console.log(`${this.name}: Sync failed!`);
        socket.emit('SYNC', { status: 'SYNC_FAILED' });
    }
});
