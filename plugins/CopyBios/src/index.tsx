import { findByNameAll } from "@vendetta/metro";
import { ReactNative } from "@vendetta/metro/common";
import { after, unpatchAll } from "@vendetta/patcher";

function makeTextSelectable(node: any): void {
  if (!node || typeof node !== "object") return;

  if (node.type === ReactNative.Text) {
    node.props.selectable = true;

    if (typeof node.props.onPress !== "function") {
      node.props.onPress = () => {};
    }
  }

  const children = node.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      makeTextSelectable(child);
    }
  } else if (typeof children === "object") {
    makeTextSelectable(children);
  }
}

const BioTextModules = findByNameAll("BioText", false);

for (const BioText of BioTextModules) {
  after("default", BioText, ([props], res) => {
    if (!res?.props) return res;

    res.props.selectable = true;

    if (typeof res.props.onPress !== "function") {
      res.props.onPress = () => {};
    }

    makeTextSelectable(res);
    return res;
  });
}

export const onUnload = () => unpatchAll();