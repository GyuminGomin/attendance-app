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
  }
  getAllAttendance: () => {
    return ipcRenderer.invoke('events:getAllAttendance');
  }
});

declare global {
  interface Window {
    api: {
      checkTodayAttendance: () => Promise<{ checked: boolean; newlyChecked: boolean; date: string }>;
      getMonthAttendance: (year: number, month: number) => Promise<string[]>;
      getEventsByDate: (date: string) => Promise<any[]>;
      saveEventsByDate: (date: string, events: any[]) => Promise<{ success: boolean }>;
    };
  }
}
