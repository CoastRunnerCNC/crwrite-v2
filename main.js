import { app, BrowserWindow } from 'electron'
import serve from 'electron-serve'
const loadURL = serve({ directory: 'build' })

const createWindow = () => {
	const win = new BrowserWindow({
		width: 1200,
		height: 700
	})

	// This blanket allows all serial devices to be accessed
	win.webContents.session.setDevicePermissionHandler((details) => {
		if (details.deviceType === 'serial') {
			return true
		}
		return false
	})

	loadURL(win)
	// win.loadFile('build/test/index.html')
}

app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})
