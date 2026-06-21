import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("icpcTrainer", {
  platform: process.platform
});
