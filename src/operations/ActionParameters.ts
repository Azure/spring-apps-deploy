import * as core from '@actions/core';
import { Package, PackageType } from 'azure-actions-utility/packageUtility';

export class Inputs {
    public static readonly AZURE_SUBSCRIPTION = 'azure-subscription';
    public static readonly RESOURCE_GROUP_NAME = 'resource-group-name';
    public static readonly SERVICE_NAME = 'service-name';
    public static readonly ACTION = 'action';
    public static readonly APP_NAME = 'app-name';
    public static readonly USE_STAGING_DEPLOYMENT = 'use-staging-deployment';
    public static readonly CREATE_NEW_DEPLOYMENT = 'create-new-deployment';
    public static readonly DEPLOYMENT_NAME = 'deployment-name';
    public static readonly ENVIRONMENT_VARIABLES = 'environment-variables';
    public static readonly JVM_OPTIONS = 'jvm-options'
    public static readonly RUNTIME_VERSION = 'runtime-version';
    public static readonly DOTNETCORE_MAINENTRY_PATH = 'dotnetcore-mainentry-path';
    public static readonly VERSION = 'version';
    public static readonly PACKAGE = 'package';
}

export class Actions {
    public static readonly DEPLOY = 'deploy';
    public static readonly SET_PRODUCTION = 'set-production';
    public static readonly DELETE_STAGING_DEPLOYMENT = 'delete-staging-deployment';
}

export class ActionParametersUtility {
    public static getParameters(): ActionParameters {
        core.debug('Started getParameters');
        var taskParameters: ActionParameters = {
            azureSubscription: core.getInput(Inputs.AZURE_SUBSCRIPTION, {"required": true}),
            serviceName: core.getInput(Inputs.SERVICE_NAME, {"required": true}),
            action: core.getInput(Inputs.ACTION, {"required": true}).toLowerCase(),
            appName: core.getInput(Inputs.APP_NAME, {"required": true}),
            useStagingDeployment: core.getInput(Inputs.USE_STAGING_DEPLOYMENT, {"required": true}).toLowerCase() == "true",
            createNewDeployment: core.getInput(Inputs.CREATE_NEW_DEPLOYMENT, {"required": false}).toLowerCase() == "true",
            deploymentName: core.getInput(Inputs.DEPLOYMENT_NAME, {"required": false}),
            environmentVariables: core.getInput(Inputs.ENVIRONMENT_VARIABLES, {"required": false}),
            jvmOptions: core.getInput(Inputs.JVM_OPTIONS, {"required": false}),
            runtimeVersion: core.getInput(Inputs.RUNTIME_VERSION, {"required": false}),
            dotNetCoreMainEntryPath: core.getInput(Inputs.DOTNETCORE_MAINENTRY_PATH, {"required": false}),
            version: core.getInput(Inputs.VERSION, {"required": false})
        }

        //Do not attempt to parse package in non-deployment steps. This causes variable substitution errors.
        if (taskParameters.action == Actions.DEPLOY) {
            taskParameters.Package = new Package(core.getInput(Inputs.PACKAGE, {"required": true}));
        }

        core.debug('Task parameters: ' + JSON.stringify(taskParameters));
        return taskParameters;
    }
}


export interface ActionParameters {
    azureSubscription: string,
    resourceGroupName?: string;
    action: string;
    serviceName: string;
    appName: string;
    useStagingDeployment?: boolean;
    createNewDeployment?: boolean;
    deploymentName?: string;
    environmentVariables?: string;
    Package?: Package;
    jvmOptions?: string;
    runtimeVersion?: string;
    dotNetCoreMainEntryPath?: string;
    version?: string;
}
