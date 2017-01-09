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

## Installation
 1. Clone this repo into `~/MagicMirror/modules` directory.
 2. Configure your `~/MagicMirror/config/config.js`:

    ```
    {
        module: "MMM-Mobile"
    }
    ```
 3. Run command `npm install` in `~/MagicMirror/modules/MMM-Mobile` directory.
