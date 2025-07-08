import { before } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";
import { ReactNative } from "@vendetta/metro/common";
import { formatBytes } from "./lib/utils";
import { showToast } from "@vendetta/ui/toasts";
import { storage } from "@vendetta/plugin";
import { uploadToCatbox } from "./lib/catbox";
import settings from "./settings";
import { getAssetIDByName } from "@vendetta/ui/assets";

const Dialog = findByProps("show", "confirm", "close");
const CloudUpload = findByProps("CloudUpload")?.CloudUpload;

let unpatches: (() => void)[] = [];

export default {
  onLoad() {
    unpatches.push(
      before("reactNativeCompressAndExtractData", CloudUpload.prototype, function () {
        const file = this;
        const size = file?.preCompressionSize;
        const readableSize = formatBytes(size);
        const userhash = storage.userhash?.trim();

        console.log("[CatboxUploader] Hook triggered! File size:", readableSize);

        if (size > 10 * 1024 * 1024) {
          if (!userhash) {
            showToast(`Uploading ${readableSize} file to Catbox anonymously...`, getAssetIDByName("ic_file_upload_24px"));
          } else {
            showToast(`Uploading ${readableSize} file to Catbox...`, getAssetIDByName("ic_file_upload_24px"));
          }

          uploadToCatbox(file)
            .then((catboxUrl) => {
              if (catboxUrl) {
                Dialog.show({
                  title: "Upload Successful",
                  body: `Here’s your file link:\n${catboxUrl}`,
                  confirmText: "Copy Link",
                  cancelText: "Close",
                  confirmColor: "brand",
                  onConfirm: () => {
                    ReactNative.Clipboard.setString(catboxUrl);
                    showToast("Copied to clipboard!", "success");
                    Dialog.close();
                  },
                  onCancel: () => Dialog.close(),
                });
              } else {
                Dialog.show({
                  title: "Upload Failed",
                  body: "Could not upload the file to catbox.moe. Please try again later.",
                  confirmText: "OK",
                  confirmColor: "red",
                  onConfirm: () => Dialog.close(),
                });
              }
            })
            .catch((err) => {
              console.error("[CatboxUploader] Upload error:", err);
              Dialog.show({
                title: "Upload Error",
                body: "An unexpected error occurred during upload.",
                confirmText: "OK",
                confirmColor: "red",
                onConfirm: () => Dialog.close(),
              });
            });

          return []; // can't hijack the native upload pls help
        }
      })
    );

    this.settings = settings;
  },

  onUnload() {
    unpatches.forEach((u) => u());
  },

  settings,
};