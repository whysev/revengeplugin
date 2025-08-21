import { storage } from "@vendetta/plugin";
import { after } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";

let patches: (() => void)[] = [];

export default {
  onLoad() {
    // Default settings
    if (!storage.replacements) storage.replacements = {};

    // Find the username render function
    const UserUtils = findByProps("getUser", "getCurrentUser");

    // Patch getUser so we can override username
    patches.push(after("getUser", UserUtils, (args, user, orig) => {
      if (!user) return;
      const replacement = storage.replacements[user.username];
      if (replacement) {
        user = { ...user, username: replacement };
      }
      return user;
    }));
  },

  onUnload() {
    patches.forEach(unpatch => unpatch());
  },

  settings: () => {
    // Return a simple UI to add/remove replacements
    // Example: input for "Original Username" → "Replacement"
    // (You can use vendetta UI components like Forms.Input, Forms.Row, etc.)
  }
};
