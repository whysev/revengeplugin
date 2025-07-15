import { ReactNative } from "@vendetta/metro/common";

const { NativeModules } = ReactNative;
const FileManager =
  NativeModules.NativeFileModule ??
  NativeModules.RTNFileManager ??
  NativeModules.DCDFileManager;

export let ProxyFilename: string | null = null;

export async function uploadToProxy(
  media: any,
  {
    uploadId,
    filename,
    proxyBaseUrl,
    userhash,
    destination,
    duration = "1h",
  }: {
    uploadId: string;
    filename: string;
    proxyBaseUrl: string;
    userhash?: string;
    destination: "catbox" | "litterbox" | "pomf";
    duration?: string;
  }
): Promise<string | null> {
  try {
    const fileUri =
      media?.item?.originalUri ||
      media?.uri ||
      media?.fileUri ||
      media?.path ||
      media?.sourceURL;

    if (!fileUri) throw new Error("Missing file URI");
    ProxyFilename = filename;

    const formData = new FormData();
    formData.append("destination", destination);
    formData.append("time", duration);
    if (userhash) formData.append("userhash", userhash);

    formData.append("file", {
      uri: fileUri,
      name: filename,
      type: media.mimeType ?? "application/octet-stream",
    } as any);

    const response = await fetch(`${proxyBaseUrl}/direct`, {
      method: "POST",
      body: formData,
    });

    const json = await response.json();
    console.log("[ProxyUploader] Response:", json);

    if (!response.ok || !json?.url) {
      throw new Error(json?.error ?? "Unknown upload error");
    }

    return json.url;
  } catch (err) {
    console.error("[ProxyUploader] Upload error:", err);
    return null;
  }
}