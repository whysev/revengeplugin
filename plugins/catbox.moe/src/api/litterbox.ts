import { ReactNative } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";

const { NativeModules } = ReactNative;
const FileManager =
  NativeModules.NativeFileModule ??
  NativeModules.RTNFileManager ??
  NativeModules.DCDFileManager;

export async function uploadToLitterbox(media: any, duration = "1h"): Promise<string | null> {
  try {

    const fileUri =
      media?.item?.originalUri ||
      media?.uri ||
      media?.fileUri ||
      media?.path ||
      media?.sourceURL;

    if (!fileUri) throw new Error("Missing file URI");

    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("time", duration);

    formData.append("fileToUpload", {
      uri: fileUri,
      name: media.filename ?? "upload",
      type: media.mimeType ?? "application/octet-stream",
    } as any);

    const uploadRes = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
      method: "POST",
      body: formData,
    });

    const text = await uploadRes.text();
    console.log("[LitterboxUploader] Raw response:", text);

    if (!text.startsWith("https://")) throw new Error(text);
    return text;
  } catch (err) {
    console.error("[LitterboxUploader] Upload failed:", err);
    return null;
  }
}