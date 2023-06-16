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
    public static readonly BUILD_NAME = 'build-name';
    public static readonly PACKAGE = 'package';
    public static readonly TARGET_MODULE = 'target-module';
    public static readonly CPU = 'cpu';
    public static readonly MEMORY = 'memory';
    public static readonly BUILDER = 'builder';
    public static readonly BUILD_CPU = 'build-cpu';
    public static readonly BUILD_MEMORY = 'build-memory';
    public static readonly BUILD_ENV = 'build-env';
    public static readonly CONFIG_FILE_PATTERNS = 'config-file-patterns';
    public static readonly CONTAINER_REGISTRY = 'container-registry';
    public static readonly REGISTRY_USERNAME = 'registry-username';
    public static readonly REGISTRY_PASSWORD = 'registry-password';
    public static readonly CONTAINER_IMAGE = 'container-image';
    public static readonly CONTAINER_COMMAND = 'container-command';
    public static readonly CONTAINER_ARGS = 'container-args';
    public static readonly LANGUAGE_FRAMEWORK = 'language-framework';
    public static readonly ENABLE_LIVENESS_PROBE = 'enable-liveness-probe';
    public static readonly ENABLE_READINESS_PROBE = 'enable-readiness-probe';
    public static readonly ENABLE_STARTUP_PROBE = 'enable-startup-probe';
    public static readonly TERMINATION_GRACE_PERIOD_SECONDS = 'termination-grace-period-seconds';
    public static readonly LIVENESS_PROBE_CONFIG = 'liveness-probe-config';
    public static readonly READINESS_PROBE_CONFIG = 'readiness-probe-config';
    public static readonly STARTUP_PROBE_CONFIG = 'startup-probe-config';
}

export class Actions {
    public static readonly DEPLOY = 'deploy';
    public static readonly SET_PRODUCTION = 'set-production';
    public static readonly DELETE_STAGING_DEPLOYMENT = 'delete-staging-deployment';
    public static readonly BUILD = 'build';
    public static readonly DELETE_BUILD = 'delete-build';
}

export class ActionParametersUtility {
    public static getParameters(): ActionParameters {
        core.debug('Started getParameters');
        var taskParameters: ActionParameters = {
            azureSubscription: core.getInput(Inputs.AZURE_SUBSCRIPTION, {"required": true}),
            serviceName: core.getInput(Inputs.SERVICE_NAME, {"required": true}),
            action: core.getInput(Inputs.ACTION, {"required": true}).toLowerCase(),
            appName: core.getInput(Inputs.APP_NAME, {"required": false}),
            useStagingDeployment: core.getBooleanInput(Inputs.USE_STAGING_DEPLOYMENT, {"required": true}),
            createNewDeployment: core.getBooleanInput(Inputs.CREATE_NEW_DEPLOYMENT, {"required": false}),
            deploymentName: core.getInput(Inputs.DEPLOYMENT_NAME, {"required": false}),
            targetModule: core.getInput(Inputs.TARGET_MODULE, {"required": false}),
            cpu: core.getInput(Inputs.CPU, {"required": false}),
            memory: core.getInput(Inputs.MEMORY, {"required": false}),
            environmentVariables: core.getInput(Inputs.ENVIRONMENT_VARIABLES, {"required": false}),
            jvmOptions: core.getInput(Inputs.JVM_OPTIONS, {"required": false}),
            runtimeVersion: core.getInput(Inputs.RUNTIME_VERSION, {"required": false}),
            dotNetCoreMainEntryPath: core.getInput(Inputs.DOTNETCORE_MAINENTRY_PATH, {"required": false}),
            version: core.getInput(Inputs.VERSION, {"required": false}),
            buildName: core.getInput(Inputs.BUILD_NAME, {"required": false}),
            builder: core.getInput(Inputs.BUILDER, {"required": false}),
            buildCpu: core.getInput(Inputs.BUILD_CPU, {"required": false}),
            buildMemory: core.getInput(Inputs.BUILD_MEMORY, {"required": false}),
            buildEnv: core.getInput(Inputs.BUILD_ENV, {"required": false}),
            configFilePatterns: core.getInput(Inputs.CONFIG_FILE_PATTERNS, {"required": false}),
            containerRegistry: core.getInput(Inputs.CONTAINER_REGISTRY, {"required": false}),
            registryUsername: core.getInput(Inputs.REGISTRY_USERNAME, {"required": false}),
            registryPassword: core.getInput(Inputs.REGISTRY_PASSWORD, {"required": false}),
            containerImage: core.getInput(Inputs.CONTAINER_IMAGE, {"required": false}),
            containerCommand: core.getInput(Inputs.CONTAINER_COMMAND, {"required": false}),
            containerArgs: core.getInput(Inputs.CONTAINER_ARGS, {"required": false}),
            languageFramework: core.getInput(Inputs.LANGUAGE_FRAMEWORK, {"required": false}),
            enableLivenessProbe: core.getInput(Inputs.ENABLE_LIVENESS_PROBE, {"required": false}),
            enableReadinessProbe: core.getInput(Inputs.ENABLE_READINESS_PROBE, {"required": false}),
            enableStartupProbe: core.getInput(Inputs.ENABLE_STARTUP_PROBE, {"required": false}),
            terminationGracePeriodSeconds: Number(core.getInput(Inputs.TERMINATION_GRACE_PERIOD_SECONDS, {"required": false})),
            livenessProbeConfig: core.getInput(Inputs.LIVENESS_PROBE_CONFIG, {"required": false}),
            readinessProbeConfig: core.getInput(Inputs.READINESS_PROBE_CONFIG, {"required": false}),
            startupProbeConfig: core.getInput(Inputs.STARTUP_PROBE_CONFIG, {"required": false})
        }

        //Do not attempt to parse package in non-deployment steps. This causes variable substitution errors.
        if ((taskParameters.action == Actions.DEPLOY && !taskParameters.containerImage) || taskParameters.action == Actions.BUILD) {
            taskParameters.package = new Package(core.getInput(Inputs.PACKAGE, {"required": true}));
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
    package?: Package;
    targetModule?: string;
    cpu?: string;
    memory?: string;
    jvmOptions?: string;
    runtimeVersion?: string;
    dotNetCoreMainEntryPath?: string;
    version?: string;
    buildName?: string;
    builder?: string;
    buildCpu?: string;
    buildMemory?: string;
    buildEnv?: string;
    configFilePatterns?: string;
    containerRegistry?: string;
    registryUsername?: string;
    registryPassword?: string;
    containerImage?: string;
    containerCommand?: string;
    containerArgs?: string;
    languageFramework?: string;
    enableLivenessProbe?: string;
    enableReadinessProbe?: string;
    enableStartupProbe?: string;
    terminationGracePeriodSeconds?: number;
    livenessProbeConfig?: string;
    readinessProbeConfig?: string;
    startupProbeConfig?: string;
}
