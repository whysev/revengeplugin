import { findByProps, findByStoreName, findByTypeNameAll } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { findInReactTree } from "@vendetta/utils";
import getTag, { BUILT_IN_TAGS } from "../lib/getTag";

const TagModule = findByProps("getBotLabel");
const getBotLabel = TagModule?.getBotLabel;
const GuildStore = findByStoreName("GuildStore");

const rowPatch = ([{ guildId, user }], ret) => {
    const label = ret?.props?.label;
    const tagComponent = findInReactTree(label, (c) => c?.type?.Types);

    if (tagComponent) {
        const labelText = getBotLabel?.(tagComponent.props.type);
        if (BUILT_IN_TAGS.includes(labelText)) {
            return;
        }
    }

    const guild = GuildStore.getGuild(guildId);
    const tag = getTag(guild, undefined, user);

    if (tag) {
        if (tagComponent) {
            Object.assign(tagComponent.props, {
                type: 0,
                text: tag.text,
                textColor: tag.textColor,
                backgroundColor: tag.backgroundColor,
                verified: tag.verified,
            });
        } else {
            const children = label.props?.children;
            if (children) {
                children.splice(
                    1,
                    0,
                    <TagModule.default
                        type={0}
                        text={tag.text}
                        textColor={tag.textColor}
                        backgroundColor={tag.backgroundColor}
                        verified={tag.verified}
                    />
                );
            }
        }
    }
};

export default () => {
    const patches = []

    findByTypeNameAll("UserRow").forEach((UserRow) => patches.push(after("type", UserRow, rowPatch)))

    return () => patches.forEach((unpatch) => unpatch())
}