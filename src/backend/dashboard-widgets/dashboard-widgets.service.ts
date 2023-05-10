import {
  entitiesApiService,
  EntitiesApiService,
} from "backend/entities/entities.service";
import {
  createConfigDomainPersistenceService,
  AbstractConfigDataPersistenceService,
} from "backend/lib/config-persistence";
import { IApplicationService } from "backend/types";
import { HOME_DASHBOARD_KEY, IWidgetConfig } from "shared/types/dashboard";
import {
  listOrderApiService,
  ListOrderApiService,
} from "backend/list-order/list-order.service";
import { rolesApiService, RolesApiService } from "backend/roles/roles.service";
import { IValueLabel } from "@hadmean/chromista/dist/types";
import { userFriendlyCase } from "shared/lib/strings";
import { nanoid } from "nanoid";
import { ROYGBIV } from "shared/constants/colors";
import { SystemIconsList } from "shared/constants/Icons";
import { BadRequestError } from "backend/lib/errors";
import {
  rDBMSDataApiService,
  RDBMSDataApiService,
} from "backend/data/data-access/RDBMS";
import { IAccountProfile } from "shared/types/user";
import {
  mutateGeneratedDashboardWidgets,
  PORTAL_DASHBOARD_PERMISSION,
} from "./portal";

const runAsyncJavascriptString = async (
  javascriptString: string,
  context: Record<string, unknown>
) => {
  const AsyncFunction = async function X() {}.constructor;
  try {
    return await AsyncFunction("$", javascriptString)(context);
  } catch (error) {
    return {
      message: error.message,
      error,
      context,
      expression: javascriptString,
    };
  }
};

export class DashboardWidgetsApiService implements IApplicationService {
  constructor(
    private readonly _dashboardWidgetsPersistenceService: AbstractConfigDataPersistenceService<IWidgetConfig>,
    private readonly _entitiesApiService: EntitiesApiService,
    private readonly _listOrderApiService: ListOrderApiService,
    private readonly _rolesApiService: RolesApiService,
    private readonly _rDBMSApiDataService: RDBMSDataApiService
  ) {}

  async bootstrap() {
    await this._dashboardWidgetsPersistenceService.setup();
  }

  private getDataAccessInstance() {
    return this._rDBMSApiDataService;
  }

  async runScript(script: string, currentUser: IAccountProfile) {
    return await runAsyncJavascriptString(script, {
      currentUser,
      query: async (sql: string) =>
        await this.getDataAccessInstance().runQuery(sql),
    });
  }

  async runWidgetScript(widgetId: string, currentUser: IAccountProfile) {
    const widget = await this._dashboardWidgetsPersistenceService.getItemOrFail(
      widgetId
    );
    return await this.runScript(widget.script, currentUser);
  }

  private async generateDefaultDashboardWidgets(dashboardId: string) {
    const entitiesToShow = await this._entitiesApiService.getActiveEntities();

    const defaultWidgets = await mutateGeneratedDashboardWidgets(
      await this.generateDashboardWidgets(entitiesToShow, (entity) =>
        this._entitiesApiService.getEntityFirstFieldType(entity, "date")
      ),
      entitiesToShow
    );

    for (const widget of defaultWidgets) {
      await this._dashboardWidgetsPersistenceService.createItem(
        widget.id,
        widget
      );
    }

    const widgetList = defaultWidgets.map(({ id }) => id);

    await this._listOrderApiService.upsertOrder(dashboardId, widgetList);

    return defaultWidgets;
  }

  private generateDashboardWidgets = async (
    entitiesToShow: IValueLabel[],
    getEntityFirstDateFieldType: (entity: string) => Promise<string>
  ) => {
    const colorsList = Object.keys(ROYGBIV);

    const DEFAULT_NUMBER_OF_SUMMARY_CARDS = 8;

    const defaultWidgets: IWidgetConfig[] = await Promise.all(
      entitiesToShow
        .slice(0, DEFAULT_NUMBER_OF_SUMMARY_CARDS)
        .map(async (entity, index) => {
          const dateField = await getEntityFirstDateFieldType(entity.value);

          return {
            id: nanoid(),
            title: userFriendlyCase(`${entity.value}`),
            _type: "summary-card",
            entity: entity.value,
            color: colorsList[index % (colorsList.length - 1)],
            dateField,
            icon: SystemIconsList[index % (SystemIconsList.length - 1)],
            script: `return await $.query('SELECT count(*) FROM ${entity.value}')`,
          };
        })
    );

    const firstEntity = entitiesToShow[0];
    if (firstEntity) {
      defaultWidgets.push({
        id: nanoid(),
        title: userFriendlyCase(`${firstEntity.value}`),
        _type: "table",
        entity: firstEntity.value,
        script: `return await $.query('SELECT * FROM ${firstEntity.value} LIMIT 5')`,
      });
    }

    return defaultWidgets;
  };

  private async listDashboardWidgetsToShow(dashboardId: string) {
    const widgetList = await this._listOrderApiService.getItemOrder(
      dashboardId
    );
    if (widgetList.length === 0) {
      return await this.generateDefaultDashboardWidgets(dashboardId);
    }

    const widgets =
      (await this._dashboardWidgetsPersistenceService.getAllItemsIn(
        widgetList
      )) as IWidgetConfig[];

    return this._listOrderApiService.sortByOrder(widgetList, widgets);
  }

  async listDashboardWidgets(
    dashboardId: string,
    userRole: string
  ): Promise<IWidgetConfig[]> {
    if (
      dashboardId !== HOME_DASHBOARD_KEY &&
      !(await this._rolesApiService.canRoleDoThis(
        userRole,
        PORTAL_DASHBOARD_PERMISSION(dashboardId, false)
      ))
    ) {
      throw new BadRequestError(
        "You can't view this dashboard or it doesn't exist"
      );
    }

    return await this.listDashboardWidgetsToShow(dashboardId);
  }

  async createWidget(widget: IWidgetConfig, dashboardId: string) {
    await this._dashboardWidgetsPersistenceService.createItem(
      widget.id,
      widget
    );

    await this._listOrderApiService.appendToList(dashboardId, widget.id);
  }

  async updateWidgetList(dashboardId: string, widgetList: string[]) {
    await this._listOrderApiService.upsertOrder(dashboardId, widgetList);
  }

  async updateWidget(widgetId: string, widget: IWidgetConfig) {
    await this._dashboardWidgetsPersistenceService.updateItem(widgetId, widget);
  }

  // TODO when disabling entities then remove the correspoding entity here
  async removeWidget(widgetId: string, dashboardId: string) {
    await this._dashboardWidgetsPersistenceService.removeItem(widgetId);

    await this._listOrderApiService.removeFromList(dashboardId, widgetId);
  }
}

const dashboardWidgetsPersistenceService =
  createConfigDomainPersistenceService<IWidgetConfig>("dashboard-widgets");

export const dashboardWidgetsApiService = new DashboardWidgetsApiService(
  dashboardWidgetsPersistenceService,
  entitiesApiService,
  listOrderApiService,
  rolesApiService,
  rDBMSDataApiService
);
