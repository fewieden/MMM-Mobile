/* Magic Mirror
 * Module: MMM-Mobile
 *
 * By fewieden https://github.com/fewieden/MMM-Mobile
 *
 * MIT Licensed.
 */

/* global Module Log MM */

Module.register('MMM-Mobile', {

    defaults: {
        ip: false,
        qrSize: 300,
        qrTimer: 60 * 1000
    },

    start() {
        Log.info(`Starting module: ${this.name}`);
        this.sendSocketNotification('CONFIG', this.config);
    },

    getTranslations() {
        return {
            en: 'translations/en.json',
            de: 'translations/de.json',
            es: 'translations/es.json',
            id: 'translations/id.json'
        };
    },

    notificationReceived(notification, payload, sender) {
        if (!sender && notification === 'ALL_MODULES_STARTED') {
            this.sendSocketNotification('CREATE_QR');
        }
    },

    socketNotificationReceived(notification) {
        if (notification === 'SHOW_QR') {
            this.sendNotification('SHOW_ALERT', {
                message: this.translate('SCAN_QR_CODE'),
                imageUrl: this.file('qr.png'),
                imageHeight: `${this.config.qrSize}px`,
                timer: this.config.qrTimer
            });
        } else if (notification === 'HIDE_QR') {
            this.sendNotification('HIDE_ALERT');
        } else if (notification === 'SHOW_MODULES') {
            MM.getModules().enumerate((module) => {
                module.show(1000);
            });
        } else if (notification === 'HIDE_MODULES') {
            MM.getModules().enumerate((module) => {
                module.hide(1000);
            });
        }
    }
});
