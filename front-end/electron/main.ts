// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function getDataDir() {
  return app.getPath('userData'); // 윈도우에서 사용자별 AppData\Roaming\... 경로
}

function ensureFile(fileName: string, defaultContent: any) {
  const filePath = path.join(getDataDir(), fileName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf-8');
  }
  return filePath;
}

// --- 출석/일정 JSON 파일 경로
function getAttendanceFile() {
  return ensureFile('attendance.json', {}); // { "2025-11-24": true, ... }
}

function getEventsFile() {
  return ensureFile('events.json', {}); // { "2025-11-24": [{title, memo}], ... }
}

// --- 유틸 함수
function readJson(filePath: string) {
  const txt = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(txt || '{}');
}

function writeJson(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 오늘 날짜 문자열
function getTodayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 개발용: Vite dev 서버 주소
  if (!app.isPackaged) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 빌드된 Vue 정적 파일
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- IPC 핸들러 등록
function registerIpcHandlers() {
  // 1) 앱 시작 시 출석 체크
  ipcMain.handle('attendance:checkToday', () => {
    const file = getAttendanceFile();
    const data = readJson(file);
    const today = getTodayStr();

    if (!data[today]) {
      data[today] = {
        checked: true,
        checkedAt: new Date().toISOString()
      };
      writeJson(file, data);
      return { checked: true, newlyChecked: true, date: today };
    } else {
      return { checked: true, newlyChecked: false, date: today };
    }
  });

  // 2) 특정 월의 출석 데이터 요청
  ipcMain.handle('attendance:getMonth', (_event, payload: { year: number; month: number }) => {
    const { year, month } = payload;
    const file = getAttendanceFile();
    const data = readJson(file);

    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const result: string[] = [];
    Object.keys(data).forEach(dateStr => {
      if (dateStr.startsWith(prefix) && data[dateStr]?.checked) {
        result.push(dateStr);
      }
    });
    return result; // ["2025-11-01", "2025-11-02", ...]
  });

  // 3) 특정 날짜 일정 불러오기
  ipcMain.handle('events:getByDate', (_event, date: string) => {
    const file = getEventsFile();
    const data = readJson(file);
    return data[date] || []; // [{ title, memo, id, ... }]
  });

  // 4) 특정 날짜 일정 저장
  ipcMain.handle('events:saveByDate', (_event, payload: { date: string; events: any[] }) => {
    const { date, events } = payload;
    const file = getEventsFile();
    const data = readJson(file);

    data[date] = events;
    writeJson(file, data);
    return { success: true };
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
