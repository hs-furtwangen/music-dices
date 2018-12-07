# Music Dices

To install the application (requires `node.js` and optionally `git`):
* check out the repository using `git` or download and unzip the code
* open a shell/terminal and change the current directory to the downloaded (unzipped) `music-dices` project directory
* run `npm install`

To run the application:
* run `npm run watch` in the `music-dices` project directory in an open a shell/terminal
* to start a `sensor` client, open the URL `localhost:8000/sensor` in your browser
* to start the `display` client, open the URL `localhost:8000/display` in your browser
* to start the `controller` client, open the URL `localhost:8000/controller` in your browser

The `sensor`-client is designed to run on a mobile device (e.g. smartphone or iPod) inside the foam dices. 
The `display`-client5 is connected to a public stereo audio system.
The `controller`-client allows for changeing some parameters `<server address>:8000/controller`.
