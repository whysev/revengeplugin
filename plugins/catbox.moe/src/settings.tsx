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
        placeholder="Required for uploads to user account"
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
        subLabel="Ignore 10MB size limit"
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
    </RN.ScrollView>
  );
};