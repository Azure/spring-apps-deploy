"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionParametersUtility = exports.Actions = exports.Inputs = void 0;
const core = __importStar(require("@actions/core"));
const packageUtility_1 = require("azure-actions-utility/packageUtility");
class Inputs {
}
exports.Inputs = Inputs;
Inputs.AZURE_SUBSCRIPTION = 'azure-subscription';
Inputs.RESOURCE_GROUP_NAME = 'resource-group-name';
Inputs.SERVICE_NAME = 'service-name';
Inputs.ACTION = 'action';
Inputs.APP_NAME = 'app-name';
Inputs.USE_STAGING_DEPLOYMENT = 'use-staging-deployment';
Inputs.CREATE_NEW_DEPLOYMENT = 'create-new-deployment';
Inputs.DEPLOYMENT_NAME = 'deployment-name';
Inputs.ENVIRONMENT_VARIABLES = 'environment-variables';
Inputs.JVM_OPTIONS = 'jvm-options';
Inputs.RUNTIME_VERSION = 'runtime-version';
Inputs.DOTNETCORE_MAINENTRY_PATH = 'dotnetcore-mainentry-path';
Inputs.VERSION = 'version';
Inputs.BUILD_NAME = 'build-name';
Inputs.PACKAGE = 'package';
Inputs.TARGET_MODULE = 'target-module';
Inputs.CPU = 'cpu';
Inputs.MEMORY = 'memory';
Inputs.BUILDER = 'builder';
Inputs.BUILD_CPU = 'build-cpu';
Inputs.BUILD_MEMORY = 'build-memory';
Inputs.BUILD_ENV = 'build-env';
Inputs.CONFIG_FILE_PATTERNS = 'config-file-patterns';
Inputs.CONTAINER_REGISTRY = 'container-registry';
Inputs.REGISTRY_USERNAME = 'registry-username';
Inputs.REGISTRY_PASSWORD = 'registry-password';
Inputs.CONTAINER_IMAGE = 'container-image';
Inputs.CONTAINER_COMMAND = 'container-command';
Inputs.CONTAINER_ARGS = 'container-args';
Inputs.LANGUAGE_FRAMEWORK = 'language-framework';
Inputs.ENABLE_LIVENESS_PROBE = 'enable-liveness-probe';
Inputs.ENABLE_READINESS_PROBE = 'enable-readiness-probe';
Inputs.ENABLE_STARTUP_PROBE = 'enable-startup-probe';
Inputs.TERMINATION_GRACE_PERIOD_SECONDS = 'termination-grace-period-seconds';
Inputs.LIVENESS_PROBE_CONFIG = 'liveness-probe-config';
Inputs.READINESS_PROBE_CONFIG = 'readiness-probe-config';
Inputs.STARTUP_PROBE_CONFIG = 'startup-probe-config';
class Actions {
}
exports.Actions = Actions;
Actions.DEPLOY = 'deploy';
Actions.SET_PRODUCTION = 'set-production';
Actions.DELETE_STAGING_DEPLOYMENT = 'delete-staging-deployment';
Actions.BUILD = 'build';
Actions.DELETE_BUILD = 'delete-build';
class ActionParametersUtility {
    static getParameters() {
        core.debug('Started getParameters');
        var taskParameters = {
            azureSubscription: core.getInput(Inputs.AZURE_SUBSCRIPTION, { "required": true }),
            serviceName: core.getInput(Inputs.SERVICE_NAME, { "required": true }),
            action: core.getInput(Inputs.ACTION, { "required": true }).toLowerCase(),
            appName: core.getInput(Inputs.APP_NAME, { "required": false }),
            useStagingDeployment: core.getBooleanInput(Inputs.USE_STAGING_DEPLOYMENT, { "required": true }),
            createNewDeployment: core.getBooleanInput(Inputs.CREATE_NEW_DEPLOYMENT, { "required": false }),
            deploymentName: core.getInput(Inputs.DEPLOYMENT_NAME, { "required": false }),
            targetModule: core.getInput(Inputs.TARGET_MODULE, { "required": false }),
            cpu: core.getInput(Inputs.CPU, { "required": false }),
            memory: core.getInput(Inputs.MEMORY, { "required": false }),
            environmentVariables: core.getInput(Inputs.ENVIRONMENT_VARIABLES, { "required": false }),
            jvmOptions: core.getInput(Inputs.JVM_OPTIONS, { "required": false }),
            runtimeVersion: core.getInput(Inputs.RUNTIME_VERSION, { "required": false }),
            dotNetCoreMainEntryPath: core.getInput(Inputs.DOTNETCORE_MAINENTRY_PATH, { "required": false }),
            version: core.getInput(Inputs.VERSION, { "required": false }),
            buildName: core.getInput(Inputs.BUILD_NAME, { "required": false }),
            builder: core.getInput(Inputs.BUILDER, { "required": false }),
            buildCpu: core.getInput(Inputs.BUILD_CPU, { "required": false }),
            buildMemory: core.getInput(Inputs.BUILD_MEMORY, { "required": false }),
            buildEnv: core.getInput(Inputs.BUILD_ENV, { "required": false }),
            configFilePatterns: core.getInput(Inputs.CONFIG_FILE_PATTERNS, { "required": false }),
            containerRegistry: core.getInput(Inputs.CONTAINER_REGISTRY, { "required": false }),
            registryUsername: core.getInput(Inputs.REGISTRY_USERNAME, { "required": false }),
            registryPassword: core.getInput(Inputs.REGISTRY_PASSWORD, { "required": false }),
            containerImage: core.getInput(Inputs.CONTAINER_IMAGE, { "required": false }),
            containerCommand: core.getInput(Inputs.CONTAINER_COMMAND, { "required": false }),
            containerArgs: core.getInput(Inputs.CONTAINER_ARGS, { "required": false }),
            languageFramework: core.getInput(Inputs.LANGUAGE_FRAMEWORK, { "required": false }),
            enableLivenessProbe: core.getInput(Inputs.ENABLE_LIVENESS_PROBE, { "required": false }),
            enableReadinessProbe: core.getInput(Inputs.ENABLE_READINESS_PROBE, { "required": false }),
            enableStartupProbe: core.getInput(Inputs.ENABLE_STARTUP_PROBE, { "required": false }),
            terminationGracePeriodSeconds: Number(core.getInput(Inputs.TERMINATION_GRACE_PERIOD_SECONDS, { "required": false })),
            livenessProbeConfig: core.getInput(Inputs.LIVENESS_PROBE_CONFIG, { "required": false }),
            readinessProbeConfig: core.getInput(Inputs.READINESS_PROBE_CONFIG, { "required": false }),
            startupProbeConfig: core.getInput(Inputs.STARTUP_PROBE_CONFIG, { "required": false })
        };
        //Do not attempt to parse package in non-deployment steps. This causes variable substitution errors.
        if (taskParameters.action == Actions.DEPLOY || taskParameters.action == Actions.BUILD) {
            taskParameters.package = new packageUtility_1.Package(core.getInput(Inputs.PACKAGE, { "required": true }));
        }
        core.debug('Task parameters: ' + JSON.stringify(taskParameters));
        return taskParameters;
    }
}
exports.ActionParametersUtility = ActionParametersUtility;
