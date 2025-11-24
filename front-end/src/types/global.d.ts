// src/types/global.d.ts
export {};

declare global {
  interface Window {
    api: {
      checkTodayAttendance: () => Promise<{
        checked: boolean;
        newlyChecked: boolean;
        date: string;
      }>;
      getMonthAttendance: (year: number, month: number) => Promise<string[]>;
      getEventsByDate: (date: string) => Promise<any[]>;
      saveEventsByDate: (
        date: string,
        events: any[]
      ) => Promise<{ success: boolean }>;
    };
  }
}
