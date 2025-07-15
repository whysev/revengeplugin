import { warmUpUploader } from "./lib/warmup";
import settings from "./pages/settings";
import { loadCommand, unloadCommand } from "./pages/command";

import { ensureDefaultSettings, patchUploader } from "./handler";

let unpatches: (() => void)[] = [];

export default {
  onLoad() {
    ensureDefaultSettings();
    loadCommand();

    unpatches.push(patchUploader());

    warmUpUploader();
    console.log("[CatboxUploader] Plugin loaded.");
    this.settings = settings;
  },

  onUnload() {
    unloadCommand();
    unpatches.forEach((u) => u());
    console.log("[CatboxUploader] Plugin unloaded.");
  },

  settings,
};