// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  checkTodayAttendance: () => {
    return ipcRenderer.invoke('attendance:checkToday');
  },
  getMonthAttendance: (year: number, month: number) => {
    return ipcRenderer.invoke('attendance:getMonth', { year, month });
  },
  getEventsByDate: (date: string) => {
    return ipcRenderer.invoke('events:getByDate', date);
  },
  saveEventsByDate: (date: string, events: any[]) => {
    return ipcRenderer.invoke('events:saveByDate', { date, events });
  },
  getAllAttendance: () => {
    return ipcRenderer.invoke('events:getAllAttendance');
  },
  openMarkdownViewer: () => {
    return ipcRenderer.invoke('markdown:openViewer');
  },
  closeMarkdownViewer: () => {
    return ipcRenderer.invoke('markdown:closeViewer');
  },
  readReadme: () => {
    return ipcRenderer.invoke('markdown:readReadme');
  },
  getTodayMemo: () => {
    return ipcRenderer.invoke('preview:getTodayMemo');
  }
});

declare global {
  interface Window {
    api: {
      checkTodayAttendance: () => Promise<{ checked: boolean; newlyChecked: boolean; date: string; checkedAt: string; updatedAt: string }>;
      getMonthAttendance: (year: number, month: number) => Promise<string[]>;
      getEventsByDate: (date: string) => Promise<{ id: number; title: string; memo: string }>;
      saveEventsByDate: (date: string, events: Promise<{ id: number; title: string; memo: string }>) => Promise<{ success: boolean; checked: boolean; newlyChecked: boolean }>;
      getAllAttendance: () => Promise<{ checked: boolean; checkedAt: string; newlyChecked: boolean; updatedAt: string; id: number; title: string; memo: string }>;
      openMarkdownViewer: () => Promise<{ success: boolean }>;
      closeMarkdownViewer: () => Promise<{ success: boolean }>;
      readReadme: () => Promise<{ success: boolean; content: string }>;
      getTodayMemo: () => Promise<{ success: boolean; memo: string; date: string }>;
    };
  }
}
