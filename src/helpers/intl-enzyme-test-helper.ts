/* tslint:disable */
/**
 * Components using the react-intl module require access to the intl context.
 * This is not available when mounting single components in Enzyme.
 * These helper functions aim to address that and wrap a valid,
 * English-locale intl context around them.
 * Code adopted from https://github.com/yahoo/react-intl/wiki/Testing-with-React-Intl.
 */

import * as React from "react";
import { IntlProvider, intlShape } from "react-intl";
import { mount, shallow } from "enzyme";
import { messages } from "../data/locales/en";

// TODO make sure this file not included in prod bundle

// You can pass your messages to the IntlProvider. Optional: remove if unneeded.
// Create the IntlProvider to retrieve context for wrapping around.
const intlProvider = new IntlProvider({ locale: "en", messages }, {});
const { intl } = intlProvider.getChildContext();

/**
 * When using React-Intl `injectIntl` on components, props.intl is required.
 */
function nodeWithIntlProp(node: React.ReactElement<any>) {
  return React.cloneElement(node, { intl });
}

/**
 * Export these methods.
 */
export function shallowWithIntl(node: React.ReactElement<any>) {
  return shallow(nodeWithIntlProp(node), { context: { intl } });
}

export function mountWithIntl(node: React.ReactElement<any>) {
  return mount(nodeWithIntlProp(node), {
    context: { intl },
    childContextTypes: { intl: intlShape }
  });
}
