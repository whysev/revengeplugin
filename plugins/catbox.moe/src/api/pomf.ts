import { ReactNative } from "@vendetta/metro/common";

const { NativeModules } = ReactNative;
const FileManager =
  NativeModules.NativeFileModule ??
  NativeModules.RTNFileManager ??
  NativeModules.DCDFileManager;

export let PomfFilename: string | null = null;

export async function uploadToPomf(media: any): Promise<string | null> {
  try {
    const fileUri =
      media?.item?.originalUri ||
      media?.uri ||
      media?.fileUri ||
      media?.path ||
      media?.sourceURL;

    if (!fileUri) throw new Error("Missing file URI");

    PomfFilename = media.filename ?? "upload";

    const formData = new FormData();
    formData.append("files[]", {
      uri: fileUri,
      name: PomfFilename,
      type: media.mimeType ?? "application/octet-stream",
    } as any);

    const uploadRes = await fetch("https://pomf.lain.la/upload.php", {
      method: "POST",
      body: formData,
    });

    const json = await uploadRes.json();
    console.log("[PomfUploader] Raw response:", json);

    if (!json?.success) {
      throw new Error(json?.error ?? "Unknown error");
    }

    const fileInfo = json?.files?.[0];
    if (!fileInfo?.url) throw new Error("No URL returned from Pomf");

    return fileInfo.url;
  } catch (err) {
    console.error("[PomfUploader] Upload failed:", err);
    return null;
  }
}