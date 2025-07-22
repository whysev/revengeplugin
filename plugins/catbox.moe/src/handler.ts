import { ReactNative } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";

import { formatBytes, roundDuration, getRandomString } from "./lib/utils";
import { uploadToCatbox, CBfilename } from "./api/catbox";
import { uploadToLitterbox, LBfilename } from "./api/litterbox";
import { uploadToPomf, PomfFilename } from "./api/pomf";
import { uploadToProxy, ProxyFilename } from "./api/proxy";
import { getCloseDuration } from "./lib/state";

const MessageSender = findByProps("sendMessage");
const ChannelStore = findByProps("getChannelId");
const PendingMessages = findByProps("getPendingMessages", "deletePendingMessage");

export function ensureDefaultSettings() {
  if (typeof storage.alwaysUpload !== "boolean") storage.alwaysUpload = false;
  if (typeof storage.copy !== "boolean") storage.copy = true;
  if (typeof storage.useProxy !== "boolean") storage.useProxy = false;
  if (typeof storage.useAnonymousFileName !== "boolean") storage.useAnonymousFileName = false;
  if (typeof storage.proxyBaseUrl !== "string")
    storage.proxyBaseUrl = "https://fatboxog.onrender.com";
  if (typeof storage.defaultDuration !== "string" || !/^\d+$/.test(storage.defaultDuration))
    storage.defaultDuration = "1";
  if (typeof storage.commandName !== "string") storage.commandName = "/litterbox";
  if (!["catbox", "litterbox", "pomf"].includes(storage.selectedHost))
    storage.selectedHost = "catbox";
}

function cleanup(channelId: string) {
  try {
    const pending = PendingMessages?.getPendingMessages?.(channelId);
    if (!pending) return;

    for (const [messageId, message] of Object.entries(pending)) {
      if (message.state === "FAILED") {
        PendingMessages.deletePendingMessage(channelId, messageId);
        console.log(`[catbox.moe] Deleted failed message: ${messageId}`);
      }
    }
  } catch (err) {
    console.warn("[catbox.moe] Failed to delete pending messages:", err);
  }
}

export function patchUploader(): () => void {
  const CloudUpload = findByProps("CloudUpload")?.CloudUpload;
  const originalUpload = CloudUpload.prototype.reactNativeCompressAndExtractData;

  CloudUpload.prototype.reactNativeCompressAndExtractData = async function (...args: any[]) {
    const file = this;
    const size = file?.preCompressionSize ?? 0;
    const readableSize = formatBytes(size);

    if (size > 1024 * 1024 * 1024) {
      showToast("❌ File too large (max 1 GB)");
      return null;
    }

    const alwaysUpload = !!storage.alwaysUpload;
    const copy = !!storage.copy;
    const useProxy = !!storage.useProxy;
    const useAnonymous = !!storage.useAnonymousFileName;
    const selectedHost = storage.selectedHost || "catbox";

    const shouldUpload = alwaysUpload || size > 10 * 1024 * 1024;
    if (!shouldUpload) return originalUpload.apply(this, args);

    let slashDuration = getCloseDuration();
    const commandTriggered = slashDuration !== null;

    if (!slashDuration) slashDuration = storage.defaultDuration || "1";
    let parsed = parseInt(slashDuration);
    if (isNaN(parsed)) parsed = 1;
    const duration = `${roundDuration(parsed)}h`;

    const tooBigForCatbox = size > 200 * 1024 * 1024;

    let useHost: "catbox" | "litterbox" | "pomf" = "catbox";
    if (commandTriggered) {
      useHost = "litterbox";
    } else if (tooBigForCatbox) {
      useHost = selectedHost === "catbox" ? "litterbox" : selectedHost;
    } else {
      useHost = selectedHost;
    }

    const host = useHost.charAt(0).toUpperCase() + useHost.slice(1);
    const destination = useProxy ? `proxied ${host}` : host;
    showToast(`📤 Uploading ${readableSize} to ${destination}...`);

    console.log("[Uploader] File size:", readableSize);
    console.log("[Uploader] Upload decision:", {
      alwaysUpload,
      selectedHost,
      useProxy,
      useAnonymous,
      commandTriggered,
      useHost,
      duration,
      tooBigForCatbox,
    });

    let channelId = this?.channelId ?? ChannelStore?.getChannelId?.();

    try {
      let link: string | null = null;
      let filename: string | null = null;

      if (useProxy) {
        const uploadId = Math.random().toString(36).slice(2, 10);
        const proxyBaseUrl = storage.proxyBaseUrl?.trim() || "";

        link = await uploadToProxy(file, {
          uploadId,
          filename: file?.filename ?? "upload",
          proxyBaseUrl,
          userhash: storage.userhash,
          destination: useHost,
          duration,
        });

        filename = ProxyFilename ?? "file";
      } else {
        switch (useHost) {
          case "litterbox":
            link = await uploadToLitterbox(file, duration);
            filename = LBfilename;
            break;
          case "pomf":
            link = await uploadToPomf(file);
            filename = PomfFilename;
            break;
          default:
            link = await uploadToCatbox(file);
            filename = CBfilename;
        }
      }

      if (typeof this.setStatus === "function") {
        this.setStatus("CANCELED");
      }

      if (channelId) {
        setTimeout(() => cleanup(channelId), 500);
      }

      if (link) {
        let hyperlinkText: string;

        if (useAnonymous) {
          const ext = (filename?.split(".").pop() ?? "bin").toLowerCase();
          hyperlinkText = `${getRandomString()}.${ext}`;
        } else {
          hyperlinkText = filename ?? "file";
        }

        const content = `[${hyperlinkText}](${link})`;

        if (copy) {
          ReactNative.Clipboard.setString(content);
          showToast("Copied to clipboard!");
        } else if (channelId && MessageSender?.sendMessage) {
          await MessageSender.sendMessage(channelId, { content });
          showToast("Link sent to chat.");
        } else {
          showToast("Upload succeeded but could not send link.");
        }
      } else {
        console.warn("[Uploader] Upload failed, no link returned.");
        showToast("Upload failed.");
      }
    } catch (err) {
      console.error("[Uploader] Upload error:", err);
      showToast("Upload error occurred.");

      if (channelId) {
        setTimeout(() => deleteFailedMessages(channelId), 500);
      }
    }

    return null;
  };

  return () => {
    CloudUpload.prototype.reactNativeCompressAndExtractData = originalUpload;
  };
}