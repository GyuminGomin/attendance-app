# MCP

## MCP Servers & Clients
- https://glama.ai/mcp/servers
- https://mcp.so
- https://smithery.ai (2025.11.26 기준 프로젝트 올리면 바로 적용가능한 웹 LLM 같은 느낌)

### MCP란
```
LLM이 외부 도구(파일, DB, API, CLI 등)를 표준화된 방식으로 호출할 수 있게 해주는 JSON-RPC 기반 프로토콜

호스트
- Cursor, Vs Code Copilot, ChatGpt Desktop
- 채팅 UI랑 LLM을 들고 있고, MCP 클라이언트를 내장하고 있음

MCP Server
- Node/Ts, Python 등으로 돌리는 백엔드 프로세스
- 툴을 정의해 놓고, LLM이 tools/call을 보내면 실제로 실행해서 결과만 돌려줌

Tool
- LLM 입장에서 함수 같은 것
ex.
  run_calendar_diagnostics -> npm run build / npm run lint 돌리고 에러 로그 반환
  patch_filie -> 특정 파일에서 문자열 치환해서 저장
```

### MCP 서버가 없어도 되는 것 (기본 기능)
```
- 파일 자동 수정 (Cursor, Codeium, VS Code Copilot)
LLM이 자동으로 diff 패치를 만들어 파일 수정 가능
따라서 일반적인 코드 수정 / 주석 추가 / 리팩터링 / 버그 수정 정도면 MCP 없이도 충분히 잘 작동

- 필요한 이유 : 오류 자동 수정이나 자동화된 개발 워크플로우를 만들때만 MCP 필요

- 예시
npm run build / lint / test 같은 실제 명령 실행
LLM은 파일을 읽을 수 있지만, 기본적으로 프로세스를 실행할 권한은 없음.

MCP를 써야
npm run build 실행 -> 에러 가져오기
pytest 실행
DB에 쿼리 날리기
Git 명령 실행
서버 API 호출
시스템 파일 조작 (지정 경로만)
```



### - 참고주소

https://github.com/modelcontextprotocol/typescript-sdk

#### mcp-server 생성
##### 1. 프로젝트 상위 같은 위치에 mcp-server 폴더 생성
##### 2. mcp-server 폴더에서 npm init -y
    - npm 초기화
##### 3. npm install @modelcontextprotocol/sdk zod
    - MCP SDK + zod 설치
##### 4. npm install -D typescript tsx @types/node
    - 개발용 의존성
##### 5. npx tsc --init
    - tsconfig 생성
``` js
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}

/**
 * 설명
 * - target : TypeScript 코드를 컴파일 하여 타겟할 JS 버전 지정
 * - module : NodeNext는 Node.js 환경의 최신 모듈 시스템인 ES Module, CommonJS를 모두 처리할 수 있도록 TypeScript에게 알려줌
 * - moduleResolution : 모듈 해석 방식
 * - rootDir : TypeScript 소스 파일들이 위치하는 경로
 * - outDir : 컴파일된 JavaScript 파일들이 출력될 디렉토리 지정
 * - esModuleInterop : CommonJS 모듈들을 ES Module처럼 가져올 수 있도록 상호 운용성을 활성화
 * - strict : 모든 엄격한 타입 검사 옵션을 한 번에 활성화
 * - skipLibCheck ; 프로젝틍 포함된 선언 파일(.d.ts) 또는 라이브러리 파일에 대한 타입 검사를 건너뛰도록 함
 * - include : 컴파일러가 타입 검사 및 컴파일할 파일들을 지정
 * /
```

##### 6. package.json에 스크립트 추가
``` json
// 2025.11.26 기준 버전
{
  "name": "attendance-mcp-server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/server.ts",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.23.0",
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3"
  }
}
```

##### 7. 서버 코드 작성 (src/server.ts)
``` js
// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promisify } from "node:util";
import { exec as rawExec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const exec = promisify(rawExec);

// MCP 서버 인스턴스 생성
const server = new McpServer({
  name: "calendar-helper",
  version: "0.1.0",
});

// 1) 빌드/테스트/린트 실행 툴
server.registerTool(
  "run_diagnostics",
  {
    title: "Run diagnostics for calendar app",
    description:
      "달력일정앱에서 npm 명령(빌드, 테스트, 린트 등)을 실행하고 결과를 반환합니다.",
    inputSchema: z
      .object({
        command: z
          .string()
          .default("npm run build")
          .describe(
            "프로젝트 루트에서 실행할 명령. 예: 'npm run build', 'npm run lint'"
          ),
      })
      .optional(),
  },
  async (input) => {
    const command = input?.command ?? "npm run build";

    try {
      // MCP 서버를 실행할 때 Cursor에서 cwd를 달력앱 루트로 잡아줄 예정
      const { stdout, stderr } = await exec(command, {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
      });

      // 로그는 stdout이 MCP 프로토콜이 쓰이므로, 여기서는 content로만 반환해야 함
      const text =
        `COMMAND: ${command}\n\n` +
        `STDOUT:\n${stdout}\n\n` +
        `STDERR:\n${stderr}`;

      return {
        content: [{ type: "text", text }],
      };
    } catch (error: any) {
      const stdout = error?.stdout ?? "";
      const stderr = error?.stderr ?? error?.message ?? "Unknown error";

      const text =
        `COMMAND FAILED: ${command}\n\n` +
        `STDOUT:\n${stdout}\n\n` +
        `STDERR:\n${stderr}`;

      return {
        content: [{ type: "text", text }],
      };
    }
  }
);

// 2) 파일 패치 툴 (간단한 search/replace)
server.registerTool(
  "patch_file",
  {
    title: "Patch a source file in the calendar app",
    description:
      "프로젝트 내 특정 파일에서 문자열을 찾아 다른 문자열로 교체합니다. 간단한 자동 수정을 위해 사용합니다.",
    inputSchema: z.object({
      relativePath: z
        .string()
        .describe("프로젝트 루트 기준 상대 경로. 예: 'src/main.ts'"),
      search: z
        .string()
        .describe("파일에서 찾아서 교체할 기존 문자열(정확히 일치해야 함)"),
      replace: z.string().describe("대체할 새 문자열"),
    }),
  },
  async ({ relativePath, search, replace }) => {
    const root = process.cwd();
    const filePath = path.join(root, relativePath);

    let original: string;
    try {
      original = await fs.readFile(filePath, "utf8");
    } catch (err: any) {
      return {
        content: [
          {
            type: "text",
            text: `파일을 읽을 수 없습니다: ${relativePath}\n\n${err?.message}`,
          },
        ],
      };
    }

    if (!original.includes(search)) {
      return {
        content: [
          {
            type: "text",
            text: `파일에서 search 문자열을 찾을 수 없습니다.\n파일: ${relativePath}\nsearch: ${search}`,
          },
        ],
      };
    }

    const updated = original.replace(search, replace);

    try {
      await fs.writeFile(filePath, updated, "utf8");
    } catch (err: any) {
      return {
        content: [
          {
            type: "text",
            text: `파일을 쓸 수 없습니다: ${relativePath}\n\n${err?.message}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `파일 패치 완료: ${relativePath}\n\nsearch → replace 한 번 적용됨.`,
        },
      ],
    };
  }
);

async function main() {
  // stdio 기반 MCP 서버 실행
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // 중요: stdout에는 MCP JSON만 나가야 하므로, 로그는 가능하면 stderr 쓰기
  console.error("[calendar-helper] MCP server ready (stdio)");
}

main().catch((err) => {
  console.error("MCP server failed:", err);
  process.exit(1);
});
```

##### 8. cursor에서 MCP 설정 열기
    - Ctrl + Shift + P -> Cursor Settings
    - 왼쪽 사이드바에서 MCP 섹션 클릭
    - Custom MCP 생성
    - 프로젝트 루트 경로에 .cursor/mcp.json 파일 생성
``` json
{
  "mcpServers": {
    "attendance-helper": {
      "command": "npx",
      "args": ["tsx", "D:/git/projects/attendance-app/attendance-mcp-server/src/server.ts"],
      "cwd": "D:/git/projects/attendance-app/front-end",
      "type": "stdio"
    }
  }
}

설명
-> args 두번째는 절대경로로 server.ts 위치
-> cwd는 프로젝트 경로
```

##### 9. 실제 실행
```
"attendance-helper MCP 툴을 사용해서
1) npm run build를 실행해서 에러를 확인하고,
2) 필요한 경우 patch_file 툴을 이용해서 코드를 수정한 다음,
3) 다시 npm run build를 실행해서 빌드가 통과되게 만들어줘.
작업한 파일 경로와 변경 내용을 모두 설명해줘."

실제로 수정까지 해주는 것 확인
```