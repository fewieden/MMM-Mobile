# MMM-Mobile

This is a middleware to configurate your MagicMirror via a mobile application for iOS, Android and Windows Phone.

## Dependencies
  * An installation of [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror)
  * npm
  * [socket.io](https://www.npmjs.com/package/socket.io)
  * [qr-image](https://www.npmjs.com/package/qr-image)
  * [simple-git](https://www.npmjs.com/package/simple-git)
  * [async](https://www.npmjs.com/package/async)
  * [moment](https://www.npmjs.com/package/moment)

## Hostname
Before using this module check if your network can resolve hostnames by accessing your mirror in your browser on another computer.
If not you have to use the config option `ip`.

## Installation
 1. Clone this repo into `~/MagicMirror/modules` directory.
 2. Configure your `~/MagicMirror/config/config.js`:

    ```
    {
        module: "alert"
    },
    {
        module: "MMM-Mobile"
    }
    ```
 3. Run command `npm install` in `~/MagicMirror/modules/MMM-Mobile` directory.
 
 It is important to also have the alert module in your config, otherwise you will not see the qr-code.

## Config Options
| **Option** | **Default** | **Description** |
| --- | --- | --- |
| `ip` | `false` | Enter the ip of your MagicMirror. Default uses the hostname. |
| `qrSize` | `300` | Size of the qr-code in pixel |
| `qrTimer` | `60 * 1000 (1 min)` | time to display qr-code. |
