"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// electron/preload.ts
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    checkTodayAttendance: () => {
        return electron_1.ipcRenderer.invoke('attendance:checkToday');
    },
    getMonthAttendance: (year, month) => {
        return electron_1.ipcRenderer.invoke('attendance:getMonth', { year, month });
    },
    getEventsByDate: (date) => {
        return electron_1.ipcRenderer.invoke('events:getByDate', date);
    },
    saveEventsByDate: (date, events) => {
        return electron_1.ipcRenderer.invoke('events:saveByDate', { date, events });
    },
    getAllAttendance: () => {
        return electron_1.ipcRenderer.invoke('events:getAllAttendance');
    }
});
