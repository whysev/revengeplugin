import { ReactNative } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";

const { NativeModules } = ReactNative;
const FileManager =
  NativeModules.NativeFileModule ??
  NativeModules.RTNFileManager ??
  NativeModules.DCDFileManager;

export async function uploadToCatbox(media: any): Promise<string | null> {
  try {
    console.log("[CatboxUploader] Media object:", media);

    const fileUri =
      media?.item?.originalUri ||
      media?.uri ||
      media?.fileUri ||
      media?.path ||
      media?.sourceURL;

    if (!fileUri) throw new Error("Missing file URI");

    const userhash = storage.userhash?.trim();

    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    if (userhash) formData.append("userhash", userhash);

    formData.append("fileToUpload", {
      uri: fileUri,
      name: media.filename ?? "upload",
      type: media.mimeType ?? "application/octet-stream",
    } as any);

    const uploadRes = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
    });

    const text = await uploadRes.text();
    console.log("[CatboxUploader] Raw response:", text);

    if (!text.startsWith("https://")) throw new Error(text);
    return text;
  } catch (err) {
    console.error("[CatboxUploader] Upload failed:", err);
    return null;
  }
}