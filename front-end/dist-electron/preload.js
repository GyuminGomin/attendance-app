// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('api', {
    checkTodayAttendance: () => {
        return ipcRenderer.invoke('attendance:checkToday');
    },
    getMonthAttendance: (year, month) => {
        return ipcRenderer.invoke('attendance:getMonth', { year, month });
    },
    getEventsByDate: (date) => {
        return ipcRenderer.invoke('events:getByDate', date);
    },
    saveEventsByDate: (date, events) => {
        return ipcRenderer.invoke('events:saveByDate', { date, events });
    }
});
