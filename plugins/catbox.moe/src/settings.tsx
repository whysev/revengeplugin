import { ReactNative as RN } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";

const { FormInput, FormDivider, FormSwitchRow } = Forms;

export default () => {
  useProxy(storage);

  return (
    <RN.ScrollView style={{ flex: 1 }}>
      <FormInput
        title="Catbox Userhash"
        placeholder="Required for uploads to catbox account"
        value={storage.userhash || ""}
        onChange={(v: string) => (storage.userhash = v.trim())}
        helpText={
          !storage.userhash ? (
            <RN.Text style={{ color: "#989898" }}>Optional</RN.Text>
          ) : null
        }
      />
      <FormDivider />
      <FormSwitchRow
        label="Always upload to Catbox"
        subLabel="Ignore the 10MBs limit of triggering catbox"
        value={!!storage.alwaysUpload}
        onValueChange={(v: boolean) => {
          storage.alwaysUpload = v;
        }}
      />
      <FormDivider />
      <FormSwitchRow
        label="Show result link copy dialog"
        subLabel="Uncheck to send link to chat automatically"
        value={!!storage.showDialogAfterUpload}
        onValueChange={(v: boolean) => {
          storage.showDialogAfterUpload = v;
        }}
      />
      <FormDivider />
      <FormSwitchRow
        label="Use Litterbox instead of Catbox"
        subLabel="Temporary uploads with duration on litterbox.moe"
        value={!!storage.useLitterbox}
        onValueChange={(v: boolean) => {
          storage.useLitterbox = v;
        }}
      />
      <FormDivider />
      <FormInput
        title="Default Litterbox Duration (hours)"
        placeholder="1"
        keyboardType="numeric"
        value={storage.defaultDuration || "1"}
        onChange={(v: string) => {
          if (/^\d*$/.test(v)) storage.defaultDuration = v;
        }}
      />
      <FormDivider />
      <FormInput
        title="Litterbox Upload Command [REQUIRES RESTART]"
        placeholder="/litterbox"
        value={storage.commandName || "/litterbox"}
        onChange={(v: string) => {
          storage.commandName = v.startsWith("/") ? v : `/${v}`;
        }}
        helpText="Set Litterbox duration for the next upload, e.g. /litterbox 24 (yes you can leave it empty, idc)"
      />
    </RN.ScrollView>
  );
};