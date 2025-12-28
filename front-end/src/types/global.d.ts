// src/types/global.d.ts
export {};

declare global {
  interface Window {
    api: {
      checkTodayAttendance: () => Promise<{
        checked: boolean;
        newlyChecked: boolean;
        date: string;
        checkedAt: string;
        updatedAt: string;
      }>;
      getMonthAttendance: (year: number, month: number) => Promise<string[]>;
      getEventsByDate: (date: string) => Promise<Array<{
        id: number;
        title: string;
        memo: string;
      }>>;
      saveEventsByDate: (
        date: string,
        events: Array<{
          id: number;
          title: string;
          memo: string;
        }>
      ) => Promise<{ success: boolean; checked: boolean; newlyChecked: boolean; checkedAt: string | null; updatedAt: string | null }>;
      getAllAttendance: () => Promise<Record<string, {
        checked: boolean;
        checkedAt: string;
        newlyChecked: boolean;
        updatedAt: string;
        id: number;
        title: string;
        memo: string;
      }>>;
      openMarkdownViewer: () => Promise<{ success: boolean }>;
      closeMarkdownViewer: () => Promise<{ success: boolean }>;
      readReadme: () => Promise<{ success: boolean; content: string }>;
    };
  }
}
