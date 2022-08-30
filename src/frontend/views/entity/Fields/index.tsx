import { ErrorAlert, SectionBox, SortList, Tabs } from "@hadmean/chromista";
import { SLUG_LOADING_VALUE, useRouteParam } from "@hadmean/protozoa";
import { useChangeRouterParam, useSetPageDetails } from "frontend/lib/routing";
import { USER_PERMISSIONS } from "shared/types";
import {
  useEntityFieldLabels,
  useEntityFieldSelections,
  useEntityFieldTypes,
  useEntityFieldValidations,
  useEntitySlug,
} from "frontend/hooks/entity/entity.config";
import {
  ENTITY_FIELDS_ENDPOINT,
  useEntityFieldLists,
} from "frontend/hooks/entity/entity.store";
import {
  useEntityConfiguration,
  useUpsertConfigurationMutation,
} from "frontend/hooks/configuration/configuration.store";
import { LINK_TO_DOCS } from "frontend/views/constants";
import { BaseEntitySettingsLayout } from "../_Base";
import { FieldsLabelForm } from "./FieldsLabel.form";
import { FieldsTypeForm } from "./FieldsType.form";
import {
  ENTITY_CONFIGURATION_VIEW,
  ENTITY_FIELD_SETTINGS_TAB_LABELS,
} from "../constants";

export function EntityFieldsSettings() {
  const tabFromUrl = useRouteParam("tab");
  const changeTabParam = useChangeRouterParam("tab");

  const entity = useEntitySlug();
  const entityFieldLists = useEntityFieldLists(entity);
  const entityFieldLabelsMap = useEntityConfiguration<Record<string, string>>(
    "entity_columns_labels",
    entity
  );

  const getEntityFieldLabels = useEntityFieldLabels();
  const {
    isLoading: entityFieldTypesMapIsLoading,
    error: entityFieldTypesMapError,
  } = useEntityConfiguration<Record<string, string>>(
    "entity_columns_types",
    entity
  );

  const {
    isLoading: entityValidationsMapIsLoading,
    error: entityValidationsMapError,
  } = useEntityConfiguration<Record<string, string>>(
    "entity_validations",
    entity
  );

  const entityFieldTypes = useEntityFieldTypes();
  const entityFieldValidations = useEntityFieldValidations();
  const entityFieldSelections = useEntityFieldSelections();

  const upsertEntityFieldsMapMutation = useUpsertConfigurationMutation(
    "entity_columns_labels",
    entity
  );

  const upsertEntityTypesMapMutation = useUpsertConfigurationMutation(
    "entity_columns_types",
    entity
  );

  const upsertEntityValidationsMutation = useUpsertConfigurationMutation(
    "entity_validations",
    entity
  );

  const upsertEntitySelectionsMutation = useUpsertConfigurationMutation(
    "entity_selections",
    entity
  );

  const upsertEntityColumnsOrderMutation = useUpsertConfigurationMutation(
    "entity_fields_orders",
    entity,
    {
      otherEndpoints: [ENTITY_FIELDS_ENDPOINT(entity)],
    }
  );

  useSetPageDetails({
    pageTitle: "Field Settings",
    viewKey: ENTITY_CONFIGURATION_VIEW,
    permission: USER_PERMISSIONS.CAN_CONFIGURE_APP,
  });

  const sharedLoadingState =
    entityFieldLists.isLoading ||
    entity === SLUG_LOADING_VALUE ||
    entityFieldLabelsMap.isLoading ||
    entityValidationsMapIsLoading ||
    entityFieldTypesMapIsLoading;

  return (
    <BaseEntitySettingsLayout>
      <ErrorAlert
        message={
          entityFieldLists.error ||
          entityFieldLabelsMap.error ||
          entityValidationsMapError ||
          entityFieldTypesMapError
        }
      />
      <SectionBox
        title="Fields Settings"
        iconButtons={[
          {
            action: LINK_TO_DOCS("app-configuration/fields"),
            icon: "help",
            label: "Fields Settings Documentation",
          },
        ]}
      >
        <Tabs
          currentTab={tabFromUrl}
          onChange={changeTabParam}
          contents={[
            {
              content: (
                <FieldsLabelForm
                  isLoading={sharedLoadingState}
                  initialValues={entityFieldLabelsMap.data}
                  fields={entityFieldLists.data || []}
                  onSubmit={async (data) => {
                    await upsertEntityFieldsMapMutation.mutateAsync(
                      data as Record<string, string>
                    );
                  }}
                />
              ),
              label: ENTITY_FIELD_SETTINGS_TAB_LABELS.LABELS,
            },
            {
              content: (
                <FieldsTypeForm
                  isLoading={sharedLoadingState}
                  initialValues={{
                    types: entityFieldTypes,
                    selections: entityFieldSelections,
                    validations: entityFieldValidations,
                    validationsChanged: false,
                    selectionsChanged: false,
                    typesChanged: false,
                  }}
                  fields={entityFieldLists.data || []}
                  onSubmit={async (data) => {
                    if (data.typesChanged) {
                      await upsertEntityTypesMapMutation.mutateAsync(
                        data.types
                      );
                    }
                    if (data.validationsChanged) {
                      await upsertEntityValidationsMutation.mutateAsync(
                        data.validations
                      );
                    }
                    if (data.selectionsChanged) {
                      await upsertEntitySelectionsMutation.mutateAsync(
                        data.selections || {}
                      );
                    }
                  }}
                  getEntityFieldLabels={getEntityFieldLabels}
                />
              ),
              label: ENTITY_FIELD_SETTINGS_TAB_LABELS.TYPES,
            },
            {
              content: (
                <SortList
                  data={{
                    ...entityFieldLists,
                    data: (entityFieldLists.data || []).map((name) => ({
                      value: name,
                      label: getEntityFieldLabels(name),
                    })),
                  }}
                  onSave={async (data) => {
                    await upsertEntityColumnsOrderMutation.mutateAsync(data);
                  }}
                />
              ),
              label: ENTITY_FIELD_SETTINGS_TAB_LABELS.ORDER,
            },
          ]}
        />
      </SectionBox>
    </BaseEntitySettingsLayout>
  );
}
