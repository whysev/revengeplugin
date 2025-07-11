import { ReactNative } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";

import { formatBytes, roundDuration } from "./lib/utils";
import { uploadToCatbox } from "./api/catbox";
import { uploadToLitterbox } from "./api/litterbox";
import { getCloseDuration } from "./lib/state";

const Dialog = findByProps("show", "close", "confirm");
const MessageSender = findByProps("sendMessage");
const ChannelStore = findByProps("getChannelId");

export function ensureDefaultSettings() {
  if (typeof storage.alwaysUpload !== "boolean") storage.alwaysUpload = false;
  if (typeof storage.showDialogAfterUpload !== "boolean") storage.showDialogAfterUpload = true;
  if (typeof storage.useLitterbox !== "boolean") storage.useLitterbox = false;
  if (typeof storage.defaultDuration !== "string" || !/^\d+$/.test(storage.defaultDuration)) {
    storage.defaultDuration = "1";
  }
  if (typeof storage.commandName !== "string") storage.commandName = "litterbox";
}

export function patchUploader(): () => void {
  const CloudUpload = findByProps("CloudUpload")?.CloudUpload;
  const originalUpload = CloudUpload.prototype.reactNativeCompressAndExtractData;

  CloudUpload.prototype.reactNativeCompressAndExtractData = async function (...args: any[]) {

    const file = this;
    const alwaysUpload = !!storage.alwaysUpload;
    const showDialog = !!storage.showDialogAfterUpload;
    const useLitterbox = !!storage.useLitterbox;

    const size = file?.preCompressionSize ?? 0;
    const readableSize = formatBytes(size);
    const upload = alwaysUpload || size > 10 * 1024 * 1024;

    if (!upload) {
      return originalUpload.apply(this, args);
    }

    let slashDuration = getCloseDuration();
    const commandTriggeredLitterbox = slashDuration !== null;

    if (!slashDuration) slashDuration = storage.defaultDuration || "1";

    let parsed = parseInt(slashDuration);
    if (isNaN(parsed)) {
      parsed = 1;
    }

    const rounded = roundDuration(parsed);
    const duration = `${rounded}h`;

    const forceLitterbox = size > 200 * 1024 * 1024;
    const willUseLitterbox = !forceLitterbox && (commandTriggeredLitterbox || useLitterbox);

    console.log("[LitterboxUploader] Using duration:", duration);

    showToast(`Uploading ${readableSize} to ${willUseLitterbox ? "Litterbox" : "Catbox"}...`);

    try {
      const link = willUseLitterbox
        ? await uploadToLitterbox(file, duration)
        : await uploadToCatbox(file);

      if (typeof this.setStatus === "function") {
        this.setStatus("CANCELED");
      }

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
          const channelId = this?.channelId;
          if (channelId && MessageSender?.sendMessage) {
            await MessageSender.sendMessage(channelId, { content: link });
            showToast("Sent link to chat.");
          } else {
            showToast("Upload succeeded, but could not send link.");
          }
        }
      } else {
        console.warn("[CatboxUploader] Upload failed - no link returned");
        showToast("Upload failed.");
      }
    } catch (err) {
      console.error("[CatboxUploader] Upload error:", err);
      showToast("Upload error occurred.");
    }

    return null;
  };

  return () => {
    CloudUpload.prototype.reactNativeCompressAndExtractData = originalUpload;
  };
}