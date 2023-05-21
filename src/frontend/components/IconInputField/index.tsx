import { userFriendlyCase } from "shared/lib/strings";
import { FormTextArea, FormSelect } from "@hadmean/chromista";
import { Field } from "react-final-form";
import { required } from "@hadmean/protozoa";
import { SystemIconsList } from "shared/constants/Icons";

export function IconInputField({ value }: { value: string }) {
  return (
    <Field name="icon" validateFields={[]} validate={required}>
      {({ input, meta }) =>
        SystemIconsList.includes(value) ? (
          <FormSelect
            label="Icon"
            required
            selectData={SystemIconsList.map((icon) => ({
              value: icon,
              label: userFriendlyCase(icon),
            }))}
            meta={meta}
            input={input}
            rightActions={[
              {
                label: "Use SVG",
                action: () => input.onChange(""),
              },
            ]}
          />
        ) : (
          <FormTextArea
            rows={10}
            description="Pass in valid SVG in here with the prop `fill='currentColor'`"
            label="SVG"
            required
            meta={meta}
            input={input}
            rightActions={[
              {
                label: "Use Icon",
                action: () => input.onChange(SystemIconsList[0]),
              },
            ]}
          />
        )
      }
    </Field>
  );
}
