import { ReactNative as RN } from "@vendetta/metro/common";
import { Forms } from "@vendetta/ui/components";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";

const { FormInput, FormDivider } = Forms;

export default () => {
  useProxy(storage);

  return (
    <RN.ScrollView style={{ flex: 1 }}>
      <FormInput
        title="Catbox Userhash"
        placeholder="Required for uploads to own user account"
        value={storage.userhash || ""}
        onChange={(v: string) => (storage.userhash = v.trim())}
        helpText={
          !storage.userhash ? (
            <RN.Text style={{ color: "#989898" }}>Optional</RN.Text>
          ) : null
        }
      />
      <FormDivider />
    </RN.ScrollView>
  );
};