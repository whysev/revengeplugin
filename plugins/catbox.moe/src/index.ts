import { findByProps } from "@vendetta/metro";
import { ReactNative } from "@vendetta/metro/common";
import { formatBytes } from "./lib/utils";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { uploadToCatbox } from "./lib/catbox";
import settings from "./settings";

const Dialog = findByProps("show", "confirm", "close");
const CloudUpload = findByProps("CloudUpload")?.CloudUpload;
const MessageSender = findByProps("sendMessage");
const ChannelStore = findByProps("getChannelId");

let unpatches: (() => void)[] = [];

function ensureDefaultSettings() {
  if (typeof storage.alwaysUpload !== "boolean") storage.alwaysUpload = false;
  if (typeof storage.showDialogAfterUpload !== "boolean") storage.showDialogAfterUpload = true;
}

function getRandomString(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createWarmupFile() {
  const randomName = `warmup_${getRandomString()}.bin`;

  // Random 0.000001 to ~0.999999 MB
  const sizeInBytes = Math.floor(Math.random() * 1_048_576) + 1;

  return {
    uri: "data:application/octet-stream;base64,AA==",
    filename: randomName,
    mimeType: "application/octet-stream",
    preCompressionSize: sizeInBytes,
  };
}

function warmUpUploader() {
  setTimeout(async () => {
    try {
      await uploadToCatbox(createWarmupFile());
      console.log("[CatboxUploader] Warm-up upload complete");
    } catch (e) {
      console.warn("[CatboxUploader] Warm-up upload failed", e);
    }
  }, 0);
}

function suppressFileEmptyDialog() {
  const originalShow = Dialog.show;
  Dialog.show = function (props) {
    const title = props?.title?.toLowerCase?.() || "";
    const body = props?.body?.toLowerCase?.() || "";
    if (title.includes("file cannot be empty") || body.includes("file cannot be empty")) {
      console.log("[CatboxUploader] Suppressed Discord's default dialog");
      return;
    }
    return originalShow.call(this, props);
  };
  unpatches.push(() => {
    Dialog.show = originalShow;
  });
}

export default {
  onLoad() {
    ensureDefaultSettings();
    suppressFileEmptyDialog();

    const originalUpload = CloudUpload.prototype.reactNativeCompressAndExtractData;

    CloudUpload.prototype.reactNativeCompressAndExtractData = async function () {
      const file = this;

      const alwaysUpload = !!storage.alwaysUpload;
      const showDialog = !!storage.showDialogAfterUpload;

      const size = file?.preCompressionSize ?? 0;
      const readableSize = formatBytes(size);
      const shouldUpload = alwaysUpload || size > 10 * 1024 * 1024;

      if (!shouldUpload) return originalUpload.apply(this, arguments);

      showToast(`Uploading ${readableSize} to Catbox...`);

      try {
        const link = await uploadToCatbox(file);
        if (link) {
          if (showDialog) {
            Dialog.show({
              title: "Upload Successful",
              body: link,
              confirmText: "Copy Link",
              cancelText: "Close",
              confirmColor: "brand",
              onConfirm: () => {
                ReactNative.Clipboard.setString(link);
                showToast("Copied to clipboard!");
                Dialog.close();
              },
              onCancel: () => Dialog.close(),
            });
          } else {
            const channelId = ChannelStore?.getChannelId?.();
            if (channelId && MessageSender?.sendMessage) {
              await MessageSender.sendMessage(channelId, { content: link });
              showToast("Sent Catbox link.");
            } else {
              showToast("Upload succeeded, but could not send link.");
            }
          }
        } else {
          showToast("Upload failed.");
        }
      } catch (err) {
        console.error("[CatboxUploader] Upload error:", err);
        showToast("Upload error occurred.");
      }

      return {
        compressed: true,
        size: 1337,
        uri: "catbox://upload",
      };
    };

    unpatches.push(() => {
      CloudUpload.prototype.reactNativeCompressAndExtractData = originalUpload;
    });

    warmUpUploader();
    this.settings = settings;
  },

  onUnload() {
    unpatches.forEach((u) => u());
  },

  settings,
};