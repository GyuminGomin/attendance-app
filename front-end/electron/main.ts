// electron/main.ts
import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // 메타데이터 : 현재 파일의 경로
const __dirname = path.dirname(__filename); // 현재 파일의 디렉토리 경로

let mainWindow: BrowserWindow | null = null; // Ts의 유니온 타입 문법
let markdownViewerWindow: BrowserWindow | null = null; // 마크다운 뷰어 윈도우
let previewWindow: BrowserWindow | null = null; // 작은 미리보기 윈도우
let tray: Tray | null = null; // 트레이 아이콘
let appIsQuitting = false; // 앱 종료 플래그

function getDataDir() {
  return app.getPath('userData'); // OS별로 앱 데이터를 저장할 기본 디렉터리 (윈도우 : AppData\Roaming\..., 맥 : ~/Library/Application Support/..., 리눅스 : ~/.config/...)
}

function ensureFile(fileName: string, defaultContent: any) {
  const filePath = path.join(getDataDir(), fileName);
  if (!fs.existsSync(filePath)) { // 파일이 존재하지 않으면 json 파일 생성
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf-8'); // JSON.stringify : 객체를 JSON 문자열로 변환
  }
  return filePath;
}

// --- 출석/일정 JSON 파일 경로
function getAttendanceFile() {
  return ensureFile('attendance.json', {}); // attendance.json 파일 경로
}

function getEventsFile() {
  return ensureFile('events.json', {}); // events.json 파일 경로
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

  mainWindow.on('close', (event) => {
    // 윈도우를 닫을 때 완전히 종료하지 않고 트레이로 최소화
    if (!appIsQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function createMarkdownViewerWindow() {
  if (markdownViewerWindow) {
    markdownViewerWindow.focus();
    return;
  }

  markdownViewerWindow = new BrowserWindow({
    width: 900,
    height: 700,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // 개발용: Vite dev 서버 주소
  if (!app.isPackaged) {
    await markdownViewerWindow.loadURL('http://localhost:5173/markdown-viewer.html');
  } else {
    // 빌드된 경우: 마크다운 뷰어 HTML 파일 로드
    // public 폴더의 파일은 dist 폴더로 복사됨
    markdownViewerWindow.loadFile(path.join(__dirname, '../dist/markdown-viewer.html'));
  }

  markdownViewerWindow.on('closed', () => {
    markdownViewerWindow = null;
  });
}

function closeMarkdownViewerWindow() {
  if (markdownViewerWindow) {
    markdownViewerWindow.close();
    markdownViewerWindow = null;
  }
}

// 작은 미리보기 창 생성 (오늘 날짜의 markdown preview)
async function createPreviewWindow() {
  if (previewWindow) {
    previewWindow.focus();
    return;
  }

  previewWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // 개발용: Vite dev 서버 주소
  if (!app.isPackaged) {
    await previewWindow.loadURL('http://localhost:5173/preview.html');
  } else {
    // 빌드된 경우: 미리보기 HTML 파일 로드
    previewWindow.loadFile(path.join(__dirname, '../dist/preview.html'));
  }

  previewWindow.on('closed', () => {
    previewWindow = null;
  });
}

function closePreviewWindow() {
  if (previewWindow) {
    previewWindow.close();
    previewWindow = null;
  }
}

// 기본 트레이 아이콘 생성 (간단한 아이콘)
function createDefaultTrayIcon(): Electron.NativeImage {
  // 16x16 크기의 간단한 아이콘 생성
  // SVG 문자열을 사용하여 기본 아이콘 생성
  const svgString = `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
    <rect width="16" height="16" fill="#1976d2" rx="2"/>
    <text x="8" y="12" font-size="10" fill="white" text-anchor="middle" font-family="Arial" font-weight="bold">✓</text>
  </svg>`;
  
  try {
    const buffer = Buffer.from(svgString);
    return nativeImage.createFromBuffer(buffer);
  } catch (error) {
    // SVG 생성 실패 시 빈 이미지 대신 작은 색상 이미지 생성
    // 1x1 픽셀 PNG를 생성하고 리사이즈
    const img = nativeImage.createEmpty();
    return img;
  }
}

// 트레이 아이콘 생성 및 설정
function createTray() {
  // 트레이 아이콘 경로 찾기
  let iconPath: string | null = null;
  
  if (!app.isPackaged) {
    // 개발 환경: 여러 경로 시도
    const possiblePaths = [
      path.join(__dirname, '../../public/vite.svg'),
      path.join(process.cwd(), 'public/vite.svg'),
      path.join(process.cwd(), 'front-end/public/vite.svg')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        iconPath = possiblePath;
        break;
      }
    }
  } else {
    // 프로덕션 환경: dist 폴더의 vite.svg 사용
    iconPath = path.join(__dirname, '../dist/vite.svg');
    if (!fs.existsSync(iconPath)) {
      iconPath = null;
    }
  }
  
  let trayIcon: Electron.NativeImage;
  if (iconPath && fs.existsSync(iconPath)) {
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      // 트레이 아이콘은 작은 크기로 리사이즈
      const size = trayIcon.getSize();
      if (size.width === 0 || size.height === 0) {
        // SVG가 제대로 로드되지 않은 경우
        throw new Error('Invalid icon size');
      }
      if (size.width > 16 || size.height > 16) {
        trayIcon = trayIcon.resize({ width: 16, height: 16 });
      }
    } catch (error) {
      console.error('Failed to load tray icon:', error);
      // 아이콘 로드 실패 시 기본 아이콘 생성
      trayIcon = createDefaultTrayIcon();
    }
  } else {
    // 아이콘이 없으면 기본 아이콘 생성
    trayIcon = createDefaultTrayIcon();
  }

  // 트레이 아이콘 생성
  try {
    tray = new Tray(trayIcon);
    tray.setToolTip('출석 & 일정 기록');
  } catch (error) {
    console.error('Failed to create tray:', error);
    return; // 트레이 생성 실패 시 함수 종료
  }

  // 트레이 컨텍스트 메뉴 생성
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '다시 열기',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: '종료',
      click: () => {
        appIsQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // 트레이 아이콘 더블클릭 이벤트
  tray.on('double-click', () => {
    createPreviewWindow();
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
        checked: false,
        checkedAt: null,
        newlyChecked: false,
        updatedAt: null
      };
      writeJson(file, data);
      return { checked: data[today].checked, newlyChecked: data[today].newlyChecked, date: today, checkedAt: data[today].checkedAt || null, updatedAt: null };
    } 
    else {
      return { checked: data[today].checked, newlyChecked: data[today].newlyChecked, date: today, checkedAt: data[today].checkedAt, updatedAt: data[today].updatedAt };
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
    return data[date] || []; // { title, memo, id, ... }
  });

  // 4) 특정 날짜 일정 저장
  ipcMain.handle('events:saveByDate', (_event, payload: { date: string; events: any[] }) => {
    const { date, events } = payload;
    const file1 = getAttendanceFile();
    const data1 = readJson(file1);
    const file2 = getEventsFile();
    const data2 = readJson(file2);
    
    // 날짜 데이터가 없으면 초기화
    if (!data1[date]) {
      data1[date] = {
        checked: false,
        checkedAt: null,
        newlyChecked: false,
        updatedAt: null
      };
    }
    
    const isFirstTime = !data1[date].checked;
    const now = new Date().toISOString();
    
    if (isFirstTime) {
      // 첫 저장 시
      data1[date].checked = true;
      data1[date].newlyChecked = true;
      data1[date].checkedAt = now;
      data1[date].updatedAt = null; // 첫 저장 시에는 updatedAt 없음
    } else {
      // 수정 시
      data1[date].newlyChecked = false; // false로 유지
      data1[date].updatedAt = now; // 수정 시마다 updatedAt 업데이트
      // checkedAt은 변경하지 않음 (유지)
    }
    data2[date] = events;
    writeJson(file1, data1);
    writeJson(file2, data2);
    return { 
      success: true, 
      checked: data1[date].checked, 
      newlyChecked: data1[date].newlyChecked,
      checkedAt: data1[date].checkedAt || null,
      updatedAt: data1[date].updatedAt || null
    };
  });

  // 5) 모든 날짜와 메모 내용 가져오기
  ipcMain.handle('events:getAllAttendance', () => {
    const file1 = getAttendanceFile();
    const file2 = getEventsFile();
    const data1 = readJson(file1);
    const data2 = readJson(file2);

    const mergedDate = {};

    Object.keys(data1).forEach(date => {
      mergedDate[date] = {
        ...data1[date],
        ...(data2[date] && Array.isArray(data2[date]) && data2[date].length > 0 ? data2[date][0] : {})
      };
    });

    return mergedDate;
  });

  // 6) 마크다운 뷰어 윈도우 열기
  ipcMain.handle('markdown:openViewer', async () => {
    await createMarkdownViewerWindow();
    return { success: true };
  });

  // 7) 마크다운 뷰어 윈도우 닫기
  ipcMain.handle('markdown:closeViewer', () => {
    closeMarkdownViewerWindow();
    return { success: true };
  });

  // 8) README.md 파일 읽기
  ipcMain.handle('markdown:readReadme', () => {
    // 개발 환경과 프로덕션 환경 모두에서 올바른 경로 찾기
    let readmePath: string;
    if (!app.isPackaged) {
      // 개발 환경: 프로젝트 루트의 README.md
      readmePath = path.join(__dirname, '../../README.md');
    } else {
      // 프로덕션 환경: 앱 리소스 폴더의 README.md
      // Electron 앱의 경우, 프로젝트 루트가 리소스 폴더에 포함되어 있을 수 있음
      readmePath = path.join(process.resourcesPath, 'README.md');
      // 만약 리소스 폴더에 없으면 상대 경로로 시도
      if (!fs.existsSync(readmePath)) {
        readmePath = path.join(__dirname, '../../README.md');
      }
    }
    
    try {
      if (fs.existsSync(readmePath)) {
        const content = fs.readFileSync(readmePath, 'utf-8');
        return { success: true, content };
      } else {
        console.error('README.md not found at:', readmePath);
        return { success: false, content: '' };
      }
    } catch (error) {
      console.error('Failed to read README.md:', error);
      return { success: false, content: '' };
    }
  });

  // 9) 오늘 날짜의 메모 가져오기 (미리보기 창용)
  ipcMain.handle('preview:getTodayMemo', () => {
    const today = getTodayStr();
    const file = getEventsFile();
    const data = readJson(file);
    const events = data[today] || [];
    const memo = events && events.length > 0 && events[0]?.memo ? events[0].memo : '';
    return { success: true, memo, date: today };
  });
}

app.whenReady().then(async () => {
  // 기본 메뉴 바 제거
  Menu.setApplicationMenu(null);
  
  registerIpcHandlers();
  await createWindow();
  createTray(); // 트레이 아이콘 생성

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // 윈도우를 모두 닫아도 앱을 종료하지 않음 (트레이에서 계속 실행)
  // macOS가 아닌 경우에도 트레이에서 계속 실행
});

app.on('before-quit', () => {
  appIsQuitting = true;
});