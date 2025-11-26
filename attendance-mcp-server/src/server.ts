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
  name: "attendance-helper",
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
    title: "Patch a source file in the attendance app",
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
