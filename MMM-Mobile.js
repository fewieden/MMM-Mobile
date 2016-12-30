/* Magic Mirror
 * Module: MMM-Mobile
 *
 * By fewieden https://github.com/fewieden/MMM-Mobile
 *
 * MIT Licensed.
 */

Module.register('MMM-Mobile',{

    start: function(){
        Log.info("Starting module: " + this.name);
        this.sendSocketNotification("CONFIG", this.config);
    },

    getTranslations: function(){
        return {
            en: "translations/en.json",
            de: "translations/de.json"
        };
    },

    notificationReceived: function(notification, payload, sender){
        if(!sender && notification === "ALL_MODULES_STARTED"){
            this.sendSocketNotification("CREATE_QR");
        }
    },

    socketNotificationReceived: function(notification, payload){
        if(notification === "SHOW_QR"){
            this.sendNotification("SHOW_ALERT", {
                message: this.translate("SCAN_QR_CODE"),
                imageUrl: this.file("qr.png"),
                imageHeight: "300px",
                timer: 60 * 1000
            });
        } else if(notification === "HIDE_QR"){
            this.sendNotification("HIDE_ALERT");
        }
    }
});