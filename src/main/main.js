const { app, BrowserWindow } = require("electron");
const path = require("path");

const { registerHandlers } = require("./handlers");
registerHandlers();

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Development
  win.loadURL("http://localhost:5173");

  // Production
  // win.loadFile(path.join(__dirname, "../dist/index.html"));

  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
