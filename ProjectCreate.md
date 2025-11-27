# 프로젝트 생성

1. npm create vite@latest front-end -- --template vue-ts
``` shell
npm warn "vue-ts" is being parsed as a normal command line argument.
npm warn Unknown cli config "--template". This will stop working in the next major version of npm.
Need to install the following packages:
create-vite@8.2.0
Ok to proceed? (y) y


> npx
> create-vite front-end vue-ts

│
◇  Select a framework:
│  Vue
│
◇  Select a variant:
│  TypeScript
│
◇  Use rolldown-vite (Experimental)?:
│  No
│
◇  Install with npm and start now?
│  Yes
│
◇  Scaffolding project in D:\git\projects\attendance-app\front-end...       
│
◇  Installing dependencies with npm...
npm warn Unknown env config "template". This will stop working in the next major version of npm.

added 94 packages, and audited 95 packages in 6s

6 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
│
◇  Starting dev server...
npm warn Unknown env config "template". This will stop working in the next major version of npm.

> calendar-app@0.0.0 dev
> vite


  VITE v7.2.4  ready in 2184 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help

 *  History restored 

```

2. cd front-end

3. npm install

4. npm install electron --save-dev

5. npm install concurrently wait-on --save-dev
- concurrently
  - 여러 스크립트를 한 번에 실행
- wait-on
  - Vite 서버 열릴 때까지 기다렸다가 Electron 띄우기

6. mkdir electron

7. electron/main.ts 생성
``` js
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  // 개발 모드: Vite dev 서버로 접속
  win.loadURL('http://localhost:5173')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

```

8. electron/preload.ts 생성
``` js
// 나중에 필요하면 여기에 브릿지 코드 추가
window.addEventListener('DOMContentLoaded', () => {
  console.log('Electron preload loaded')
})
```


9. package.json 수정
``` json
{
  "name": "attendance-app",
  "private": true,
  "version": "0.0.0",
  "main": "electron/main.js",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "wait-on http://localhost:5173 && ts-node ./electron/main.ts",
    "build": "vite build && tsc -p electron.tsconfig.json",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.24"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "@vitejs/plugin-vue": "^6.0.1",
    "@vue/tsconfig": "^0.8.1",
    "concurrently": "^9.2.1",
    "electron": "^39.2.3",
    "typescript": "~5.9.3",
    "vite": "^7.2.4",
    "vue-tsc": "^3.1.4",
    "wait-on": "^9.0.3"
  }
}
```

# 참고 : 이 사이트를 꼭 보고 블로그 글 수정 필요
- https://v3-docs.vuejs-korea.org/guide/typescript/overview.html