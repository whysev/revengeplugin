import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { uploadToCatbox } from "../api/catbox";
import { uploadToLitterbox } from "../api/litterbox";
import { getRandomString } from "./utils";

export function createWarmupFile() {
  const randomName = `warmup_${getRandomString()}.bin`;
  const sizeInBytes = Math.floor(Math.random() * 1_048_576) + 1;

  return {
    uri: "data:application/octet-stream;base64,AA==",
    filename: randomName,
    mimeType: "application/octet-stream",
    preCompressionSize: sizeInBytes,
  };
}

export function warmUpUploader() {
  setTimeout(async () => {
    try {
      const service = storage.useLitterbox ? "Litterbox" : "Catbox";

      const file = createWarmupFile();
      const link = storage.useLitterbox
        ? await uploadToLitterbox(file, "1h")
        : await uploadToCatbox(file);

      console.log(`[CatboxUploader] Warm-up upload complete: ${link}`);
    } catch (e) {
      console.warn("[CatboxUploader] Warm-up upload failed", e);
    }
  }, 0);
}