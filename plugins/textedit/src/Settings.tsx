import { React } from "@vendetta/metro/common";
import { Forms, General } from "@vendetta/ui/components";
import { storage } from "@vendetta/plugin";

const { FormInput, FormRow } = Forms;

export default () => {
  const [orig, setOrig] = React.useState("");
  const [rep, setRep] = React.useState("");

  return (
    <>
      <FormInput
        title="Original Username"
        value={orig}
        onChange={setOrig}
      />
      <FormInput
        title="Replacement Username"
        value={rep}
        onChange={setRep}
      />
      <FormRow
        label="Add Replacement"
        onPress={() => {
          if (orig && rep) {
            storage.replacements[orig] = rep;
            setOrig("");
            setRep("");
          }
        }}
      />
      {Object.entries(storage.replacements).map(([o, r]) => (
        <FormRow
          key={o}
          label={`${o} → ${r}`}
          onPress={() => {
            delete storage.replacements[o];
          }}
        />
      ))}
    </>
  );
};
