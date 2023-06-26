/* eslint-disable react/function-component-definition */
import React from "react";
import { Story } from "@storybook/react";
import { Tooltip, IProps } from ".";
import { ApplicationRoot } from "../../ApplicationRoot";

export default {
  title: "Components/Tooltip",
  component: Tooltip,
  args: {
    text: "I am a tooltip content",
  },
};

const Template: Story<IProps> = (args) => (
  <ApplicationRoot>
    <Tooltip {...args}>Hover over me</Tooltip>
  </ApplicationRoot>
);

export const Default = Template.bind({});
Default.args = {};

export const Right = Template.bind({});
Right.args = {
  place: "right",
};

export const Offset = Template.bind({});
Offset.args = {
  place: "right",
  offset: 30,
};
