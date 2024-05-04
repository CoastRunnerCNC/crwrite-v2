# CRWrite v2

A rebuild of CRWrite entirely in Javascript, packaging it up as an electron app.

## Technology

Svelte is used to manage app state and provide reactive DOM updates. SvelteKit is used for file-based page routing. Styling is done with TailwindCSS.

Serial Port handling is provided by the browser itself. See the docs [here](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API). Note that only Chrome, Edge, and Opera are officially supported and this demo has only been tested on Chrome, on an M1 Mac.

## Development

To run it locally in a browser:

```bash
npm i
npm run dev
```

Then open a browser to `http://localhost:5173/` or whichever port it specifies. Make sure to open it in Chrome, not Firefox. Other browsers such as Edge, Chromium, Brave, and Opera may work but stability is not proven.

## Building for Electron

To create a production version of the code:

```bash
npm run build
```

Then, to run it all as an electron app:

```bash
npm run start
```

See `main.js` for the Electron-specific code.

## Serial Port Differences between Electron and Chrome

As a matter of security, Chrome will not allow Javascript access to any Serial Ports without the user's explicit permission. The practical implication is that your JS can call `navigator.serial.getPorts()` and the result will always be an empty list.

To ask for explicit permission from the user, you need to call `navigator.serial.requestPort()`. Doing so will trigger a popup that asks the user if they really want to allow the page to use a port.

Immediately after permission is granted, subsequent calls to `navigator.serial.getPorts()` will return a list that includes any ports the user has granted access to, if they are in fact available.

Chrome remembers the user's decisions so that subsequent reloads of the page will not require the call to `requestPort`, and `getPorts` can report accurate port info immediately.

In contrast, Electron is running as a Desktop App, so it has full access to all Operating System resources including Serial Ports. In `main.js`, the launch point for Electron, there are some lines:

```javascript
win.webContents.session.setDevicePermissionHandler((details) => {
	if (details.deviceType === 'serial') {
		return true
	}
	return false
})
```

These grant blanket access to any Javascript running within this Electron container access to all Serial Ports. The complex dance with `requestPort` is completely avoided.

## SvelteKit + Electron

Currently SvelteKit has been configured to run as a [single page app](https://kit.svelte.dev/docs/single-page-apps), because there would be no benefit in server side rendering anything, as it all runs on the user's machine and there is no search engine optimization required.

In `main.js` you'll notice the lines:

```javascript
import serve from 'electron-serve'
const loadURL = serve({ directory: 'build' })
...
loadURL(win)
```

What's happening here is that the Node process that is Electron is actually running a tiny web server which hosts the content of the `build` directory. Then we point Electron's associated browser at that tiny web server. This is not the typical way of using Electron, but it's not all that strange either. It is possible there is a way to remove this step and point Electron at the files in the `build` directory directly, such that all the urls start with `file://`. This model may be investigated in the future.

## GRBL Gotchas

When streaming gcode to GRBL, you must not overwhelm its serial receive buffer, which is only 256 bytes. To avoid doing that, it is best practice to send a single gcode command followed by a `\n`, then wait until you receive `ok` back, then send another command. In this way, GRBL will build up a queue of commands in its path planner. You will achieve smooth, efficient motion and you will never miss commands.

At the same time you will likely want to get status updates so you can render the spindle position in a DRO. To do that, you can have a second thread pinging GRBL at 5 hz, with the single character `?` which is _not_ to be followed by a `\n`. GRBL will recognize the character immediately, bypassing the serial receive buffer entirely, and it will immediately return a status reply message, which looks like `<Idle|MPos:15.000,0.000,0.000|FS:0,0>`. GRBL will _not_ return an associated `ok` message.

If you do it this way, then the `ok` message has an unambiguous meaning: `send me one more gcode command when you are ready`.

## Important Files

`main.js` is the main entrypoint for the Electron App. It is run in Node, not in a browser.

`src/routes/+layout.svelte` is the main scaffold that every page renders into. Code placed here will run on every page in the app. DOM elements placed here will be present on all pages.

`src/routes/manual/+page.svelte` is the main content of the demo.

`src/routes/manual/gcodeFile.svelte` is included for demo purposes. It demonstrates how to make separate components in Svelte.

`src/routes/guided/+page.svelte` is a demo page we can use to build a guided app experience.

## Conclusion

Javascript's event loop turns out to be the perfect abstraction for GRBL communication. The main loop looks like:

```
while (true) {
    const { value, done } = await reader.read()
    if (done) {
        // Allow the serial port to be closed later.
        reader.releaseLock()
        break
    }
    if (value) {
        // console.log('Just received: ', value)
        latestReplyBuffer += value
    }
}
```

And in Javascript, this does not block the main thread. Concurrancy is achieved through event-driven callbacks, which are hidden behind the syntactic sugar of `await` and `async`.

There is no mutex handling, no thread pools, no web workers, no multithreading whatsoever. There is also no multiprocessing or interprocess communication required.

Javascript ended up being a great impedance match for the problem at hand.
