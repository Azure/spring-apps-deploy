import { Actions, ActionParameters } from '../operations/ActionParameters';
import * as asa from '@azure/arm-appplatform'
import { uploadFileToSasUrl } from "./azure-storage";
import * as core from "@actions/core";
import { parse } from 'azure-actions-utility/parameterParserUtility';
import {SourceType} from "./AzureSpringAppsDeploymentProvider";
import fetch from 'node-fetch';
import * as fs from 'fs';

export class DeploymentHelper {

    private static listDeploymentsResult: Array<asa.DeploymentResource> = [];
    private static readonly buildServiceName = "default";

    private static async listDeployments(client: asa.AppPlatformManagementClient, params: ActionParameters): Promise<Array<asa.DeploymentResource>> {
        if (this.listDeploymentsResult.length > 0) {
            core.debug('list from cache, list deployments response: ' + JSON.stringify(this.listDeploymentsResult));
            return this.listDeploymentsResult;
        }
        const deployments = await client.deployments.list(params.resourceGroupName, params.serviceName, params.appName);
        for await (const deployment of deployments) {
            this.listDeploymentsResult.push(deployment);
        }
        core.debug('list deployments response: ' + JSON.stringify(this.listDeploymentsResult));
        return this.listDeploymentsResult;
    }

    private static async getDeployment(client: asa.AppPlatformManagementClient, params: ActionParameters, deploymentName: string): Promise<asa.DeploymentResource> {
        if (this.listDeploymentsResult.length > 0) {
            core.debug('get from list cache, list deployments response: ' + JSON.stringify(this.listDeploymentsResult));
            let ret: asa.DeploymentResource;
            this.listDeploymentsResult.forEach(deployment => {
                core.debug('deployment str: ' + JSON.stringify(deployment));
                if (deployment.name == deploymentName) {
                    ret = deployment;
                }
            });
            return ret;
        }
        const getResponse: asa.DeploymentsGetResponse = await client.deployments.get(params.resourceGroupName, params.serviceName, params.appName, deploymentName);
        return getResponse;
    }

    public static async getStagingDeploymentNames(client: asa.AppPlatformManagementClient, params: ActionParameters): Promise<Array<string>> {
        const deployments = await this.listDeployments(client, params);
        let ret: Array<string> = [];
        deployments.forEach(deployment => {
            core.debug('deployment str: ' + JSON.stringify(deployment));
            if (deployment.properties.active == false) {
                core.debug("inactive deployment name: " + deployment.name);
                ret.push(deployment.name);
            } else {
                core.debug("active deployment name: " + deployment.name);
            }
        });
        return ret;
    }

    public static async getStagingDeploymentName(client: asa.AppPlatformManagementClient, params: ActionParameters): Promise<string> {
        let deploymentNames: Array<string> = await this.getStagingDeploymentNames(client, params);
        if (deploymentNames.length >= 2) {
            throw Error('More than 1 staging deployments were found: ' + JSON.stringify(deploymentNames));
        } else if (deploymentNames.length == 0) {
            return null;
        }
        return deploymentNames[0];
    }

    public static async getProductionDeploymentName(client: asa.AppPlatformManagementClient, params: ActionParameters): Promise<string> {
        const deployments = await this.listDeployments(client, params);
        let ret: Array<string> = [];
        deployments.forEach(deployment => {
            if (deployment.properties.active) {
                ret.push(deployment.name);
            }
        });
        if (ret.length >= 2) {
            throw Error('More than 1 production deployments were found: ' + JSON.stringify(ret));
        } else if (ret.length == 0) {
            return null;
        }
        return ret[0];
    }

    public static async getAllDeploymentsName(client: asa.AppPlatformManagementClient, params: ActionParameters): Promise<Array<string>> {
        let names: Array<string> = [];
        const deployments = await this.listDeployments(client, params);
        deployments.forEach(deployment => {
            names.push(deployment.name);
        });
        return names;
    }

    public static async setActiveDeployment(client: asa.AppPlatformManagementClient, params: ActionParameters) {
        let activeDeploymentCollection: asa.ActiveDeploymentCollection = {
            activeDeploymentNames: [params.deploymentName]
        }
        const setActiveResponse: asa.AppsUpdateResponse = await client.apps.beginSetActiveDeploymentsAndWait(params.resourceGroupName, params.serviceName, params.appName, activeDeploymentCollection);
        core.debug('set active deployment response: ' + JSON.stringify(setActiveResponse));
        return;
    }

    public static async deploy(client: asa.AppPlatformManagementClient, params: ActionParameters, sourceType: string, fileToUpload: string) {
        let uploadResponse: asa.AppsGetResourceUploadUrlResponse = await client.apps.getResourceUploadUrl(params.resourceGroupName, params.serviceName, params.appName);
        core.debug('request upload url response: ' +  JSON.stringify(uploadResponse));
        await uploadFileToSasUrl(uploadResponse.uploadUrl, fileToUpload);
        let deploymentResource: asa.DeploymentResource = await this.buildDeploymentResource(client, params, sourceType, uploadResponse.relativePath);
        core.debug("deploymentResource: " + JSON.stringify(deploymentResource));
        await this.deployWithLog(client, params, deploymentResource);
        return;
    }

    public static async deployCustomContainer(client: asa.AppPlatformManagementClient, params: ActionParameters, sourceType: string) {
        let deploymentResource: asa.DeploymentResource = await this.buildDeploymentResource(client, params, sourceType, null);
        core.debug("custom container deploymentResource: " + JSON.stringify(deploymentResource));
        await this.deployWithLog(client, params, deploymentResource);
        return;
    }

    public static async deployEnterprise(client: asa.AppPlatformManagementClient, params: ActionParameters, sourceType: string, fileToUpload: string, resourceId: string) {
        const buildResponse = await this.buildAndGetResult(client, params, fileToUpload, resourceId);
        let deploymentResource: asa.DeploymentResource = await this.buildDeploymentResource(client, params, sourceType, buildResponse.properties.triggeredBuildResult.id);
        core.debug("deploymentResource: " + JSON.stringify(deploymentResource));
        await this.deployWithLog(client, params, deploymentResource);
        return;
    }

    public static async deleteDeployment(client: asa.AppPlatformManagementClient, params: ActionParameters) {
        const response = await client.deployments.beginDeleteAndWait(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName);
        core.debug('delete deployment response: ' + JSON.stringify(response));
        return;
    }

    public static async build(client: asa.AppPlatformManagementClient, params: ActionParameters, fileToUpload: string, resourceId: string) {
        const response = await this.buildAndGetResult(client, params, fileToUpload, resourceId);
        core.debug('build response: ' +  JSON.stringify(response));
        return;
    }

    public static async deleteBuild(client: asa.AppPlatformManagementClient, params: ActionParameters) {
        const response = await client.buildServiceOperations.beginDeleteBuildAndWait(params.resourceGroupName, params.serviceName, this.buildServiceName, params.buildName);
        core.debug('delete build response: ' +  JSON.stringify(response));
        return;
    }

    protected static async buildDeploymentResource(client: asa.AppPlatformManagementClient, params: ActionParameters, sourceType: string, idOrPath: string): Promise<asa.DeploymentResource> {
        let getDeploymentName = params.deploymentName;
        if (params.createNewDeployment) {
            getDeploymentName = await this.getProductionDeploymentName(client, params);
        }
        let getResponse: asa.DeploymentResource;
        if (getDeploymentName) {
            getResponse = await this.getDeployment(client, params, getDeploymentName);
        }
        let deploymentResource: asa.DeploymentResource;
        let sourcePart: {};
        if (sourceType == SourceType.CUSTOM_CONTAINER) {
            sourcePart = {
                type: SourceType.CUSTOM_CONTAINER
            }
            let customContainer: asa.CustomContainer = {};
            let imageRegistryCredential: asa.ImageRegistryCredential = {};
            if (params.containerRegistry) {
                customContainer.server = params.containerRegistry;
            }
            if (params.registryUsername || params.registryPassword) {
                imageRegistryCredential.username = params.registryUsername;
                imageRegistryCredential.password = params.registryPassword;
                customContainer.imageRegistryCredential = imageRegistryCredential;
            }
            if (params.containerImage) {
                customContainer.containerImage = params.containerImage;
            }
            if (params.containerCommand) {
                customContainer.command = params.containerCommand.split(' ');
            }
            if (params.containerArgs) {
                customContainer.args = params.containerArgs.split(' ');
            }
            if (params.languageFramework) {
                customContainer.languageFramework = params.languageFramework;
            }
            sourcePart["customContainer"] = customContainer;
        }
        else if (sourceType == SourceType.BUILD_RESULT) {
            sourcePart = {
                buildResultId: idOrPath,
                type: SourceType.BUILD_RESULT
            }
        } else {
            sourcePart = {
                relativePath: idOrPath,
                type: sourceType,
            }
        }
        if(params.version) {
            sourcePart["version"] = params.version;
        }
        let deploymentSettingsPart = {};
        let resourceRequests: asa.ResourceRequests = {};
        if (params.action == Actions.DEPLOY && params.createNewDeployment) {
            resourceRequests.cpu = params.cpu;
            resourceRequests.memory = params.memory;
            deploymentSettingsPart["resourceRequests"] = resourceRequests;
        }
        if (params.jvmOptions) {
            sourcePart["jvmOptions"] = params.jvmOptions;
        }
        if (params.dotNetCoreMainEntryPath) {
            deploymentSettingsPart["netCoreMainEntryPath"] = params.dotNetCoreMainEntryPath;
        }
        if (params.targetModule) {
            sourcePart["artifactSelector"] = params.targetModule;
        }
        if (params.runtimeVersion) {
            sourcePart["runtimeVersion"] = params.runtimeVersion;
        }
        if (params.configFilePatterns) {
            deploymentSettingsPart["addonConfigs"] = {
                applicationConfigurationService: {
                    configFilePatterns: params.configFilePatterns
                }
            }
        }
        let transformedEnvironmentVariables = {};
        if (params.environmentVariables) {
            core.debug("Environment variables modified.");
            const parsedEnvVariables = parse(params.environmentVariables);
            //Parsed pairs come back as  {"key1":{"value":"val1"},"key2":{"value":"val2"}}
            Object.keys(parsedEnvVariables).forEach(key => {
                transformedEnvironmentVariables[key] = parsedEnvVariables[key]['value'];
            });
            core.debug('Environment Variables: ' + JSON.stringify(transformedEnvironmentVariables));
            deploymentSettingsPart["environmentVariables"] = transformedEnvironmentVariables;
        }
        const disableProbe: asa.Probe = {
            disableProbe: true
        }
        if (params.enableLivenessProbe.length > 0) {
            if (params.enableLivenessProbe.toLowerCase() == "true") {
                deploymentSettingsPart["livenessProbe"] = this.loadProbeConfig(params.livenessProbeConfig);
            } else if (params.enableLivenessProbe.toLowerCase() == "false") {
                deploymentSettingsPart["livenessProbe"] = disableProbe;
            } else {
                throw new Error("Invalid value for enableLivenessProbe. Please provide true/false");
            }
        }
        if (params.enableReadinessProbe.length > 0) {
            if (params.enableReadinessProbe.toLowerCase() == "true") {
                deploymentSettingsPart["readinessProbe"] = this.loadProbeConfig(params.readinessProbeConfig);
            } else if (params.enableReadinessProbe.toLowerCase() == "false") {
                deploymentSettingsPart["readinessProbe"] = disableProbe;
            } else {
                throw new Error("Invalid value for enableReadinessProbe. Please provide true/false");
            }
        }
        if (params.enableStartupProbe.length > 0) {
            if (params.enableStartupProbe.toLowerCase() == "true") {
                deploymentSettingsPart["startupProbe"] = this.loadProbeConfig(params.startupProbeConfig);
            } else if (params.enableStartupProbe.toLowerCase() == "false") {
                deploymentSettingsPart["startupProbe"] = disableProbe;
            } else {
                throw new Error("Invalid value for enableStartupProbe. Please provide true/false");
            }
        }
        if (params.terminationGracePeriodSeconds) {
            deploymentSettingsPart["terminationGracePeriodSeconds"] = params.terminationGracePeriodSeconds;
        }
        if (getResponse) {
            let source = {...getResponse.properties.source, ...sourcePart};
            let deploymentSettings = {...getResponse.properties.deploymentSettings, ...deploymentSettingsPart};
            deploymentResource = {
                properties: {
                    source: source as asa.UserSourceInfoUnion,
                    deploymentSettings: deploymentSettings
                },
                sku: getResponse.sku
            };
        } else {
            deploymentResource = {
                properties: {
                    source: sourcePart as asa.UserSourceInfoUnion,
                    deploymentSettings: deploymentSettingsPart
                }
            };
        }
        return deploymentResource;
    }

    public static async buildAndGetResult(client: asa.AppPlatformManagementClient, params: ActionParameters, fileToUpload: string, resourceId: string): Promise<asa.BuildServiceCreateOrUpdateBuildResponse> {
        const buildName = params.action == Actions.BUILD ? params.buildName : `${params.appName}-${params.deploymentName}`;
        const uploadResponse = await client.buildServiceOperations.getResourceUploadUrl(params.resourceGroupName, params.serviceName, this.buildServiceName);
        core.debug('request upload url response: ' +  JSON.stringify(uploadResponse));
        await uploadFileToSasUrl(uploadResponse.uploadUrl, fileToUpload);
        const build: asa.Build = {
            properties: {
                relativePath: uploadResponse.relativePath,
                builder: params.builder ? `${resourceId}/buildServices/${this.buildServiceName}/builders/${params.builder}` : `${resourceId}/buildServices/${this.buildServiceName}/builders/default`,
                agentPool: `${resourceId}/buildServices/${this.buildServiceName}/agentPools/default`,
            }
        };
        if (params.buildCpu) {
            build.properties.resourceRequests.cpu = params.buildCpu;
        }
        if (params.buildMemory) {
            build.properties.resourceRequests.memory = params.buildMemory;
        }
        let transformedBuildEnvironmentVariables = {};
        if (params.buildEnv) {
            core.debug("Build environment variables modified.");
            const parsedBuildEnvVariables = parse(params.buildEnv);
            //Parsed pairs come back as  {"key1":{"value":"val1"},"key2":{"value":"val2"}}
            Object.keys(parsedBuildEnvVariables).forEach(key => {
                transformedBuildEnvironmentVariables[key] = parsedBuildEnvVariables[key]['value'];
            });
            build.properties.env = transformedBuildEnvironmentVariables;
        }
        core.debug('build: ' +  JSON.stringify(build));
        const buildResponse = await client.buildServiceOperations.createOrUpdateBuild(params.resourceGroupName, params.serviceName, this.buildServiceName, buildName, build);
        core.debug('build response: ' +  JSON.stringify(buildResponse));
        const regex = RegExp("[^/]+$");
        const buildResultName = regex.exec(buildResponse.properties.triggeredBuildResult.id)[0];
        let buildProvisioningState = 'Queuing';
        let cnt = 0;
        core.debug("wait for build result......");
        //Waiting for build result. Timeout 30 minutes.
        const logStream = await this.logStreamConstructor(client, params);
        const stagesRecorded = new Set();
        while (buildProvisioningState != 'Succeeded' && buildProvisioningState != 'Failed' && cnt++ < 180) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            core.debug("wait for 10 seconds....");
            try {
                const waitResponse = await client.buildServiceOperations.getBuildResult(params.resourceGroupName, params.serviceName, this.buildServiceName, buildName, buildResultName);
                waitResponse.properties.buildStages.forEach(async stage => {
                    if (!stagesRecorded.has(stage.name) && stage.status != "NotStarted") {
                        const url=`https://${logStream["baseUrl"]}/api/logstream/buildpods/${waitResponse.properties.buildPodName}/stages/${stage.name}?follow=true`
                        const credentials = Buffer.from(`primary:${logStream["primaryKey"]}`).toString('base64');
                        const auth = { "Authorization" : `Basic ${credentials}` };
                        const response = await fetch(url, {method: 'GET', headers : auth });
                        response.body.pipe(process.stdout);
                        stagesRecorded.add(stage.name);
                    }
                });
                core.debug('build result response: ' + JSON.stringify(waitResponse));
                buildProvisioningState = waitResponse.properties.provisioningState;
            }
            catch (e:any) {
                console.log(e.message);
            }
        }
        if (cnt == 180) {
            throw Error("Build result timeout.");
        }
        if (buildProvisioningState != 'Succeeded') {
            throw Error("Build result failed.");
        }
        return buildResponse;
    }

    public static async logStreamConstructor(client: asa.AppPlatformManagementClient, params: ActionParameters) {
        const test_keys = await client.services.listTestKeys(params.resourceGroupName, params.serviceName);
        let ret = {};
        ret["primaryKey"] = test_keys.primaryKey;
        const serviceResponse = await client.services.get(params.resourceGroupName, params.serviceName);
        ret["baseUrl"] = serviceResponse.properties.fqdn;
        return ret;
    }

    private static loadProbeConfig(probeConfig: string): asa.Probe {
        if (!probeConfig) {
            return null;
        }
        const data = this.readJsonFile(probeConfig);
        if (!data) {
            return null;
        }
        if (!data.probe) {
            throw new Error(`Probe must be provided in the json file ${probeConfig}`);
        }

        if (!data.probe.probeAction || !data.probe.probeAction.type) {
            throw new Error(`ProbeAction, Type mast be provided in the json file ${probeConfig}`);
        }

        let probeAction : asa.ProbeActionUnion = null;
        if (data.probe.probeAction.type.toLowerCase() === 'httpgetaction') {
            probeAction = {
              type: 'HTTPGetAction',
              path: data.probe.probeAction.path,
              scheme: data.probe.probeAction.scheme,
            };
        } else if (data.probe.probeAction.type.toLowerCase() === 'tcpsocketaction') {
            probeAction = {
              type: 'TCPSocketAction',
            };
        } else if (data.probe.probeAction.type.toLowerCase() === 'execaction') {
            probeAction = {
              type: 'ExecAction',
              command: data.probe.probeAction.command,
            };
        } else {
            throw new Error(`ProbeAction.Type is invalid in the json file ${probeConfig}`);
        }

        const probeSettings : asa.Probe = {
            probeAction: probeAction,
            disableProbe: false,
            initialDelaySeconds: data.probe.initialDelaySeconds,
            periodSeconds: data.probe.periodSeconds,
            timeoutSeconds: data.probe.timeoutSeconds,
            failureThreshold: data.probe.failureThreshold,
            successThreshold: data.probe.successThreshold
        };
        return probeSettings;
    }

    private static readJsonFile(file: string): any {
        const data = fs.readFileSync(file);
        return JSON.parse(data.toString());
    }

    private static async printLatestAppInstanceLog(client: asa.AppPlatformManagementClient, params: ActionParameters) {
        const logStream = await this.logStreamConstructor(client, params);
        const deploymentResource = await client.deployments.get(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName);
        const instances = deploymentResource.properties.instances;
        let startTime = instances[0].startTime;
        let instanceName = instances[0].name;

        // print the newly created instance log
        for (const tempInstance of instances) {
            if (tempInstance.startTime > startTime) {
                startTime = tempInstance.startTime;
                instanceName = tempInstance.name;
            }
        }
        let streamingUrl = `https://${logStream["baseUrl"]}/api/logstream/apps/${params.appName}/instances/${instanceName}`;
        const logParams: any = {};
        logParams['tailLines'] = 500;
        logParams['limitBytes'] = 1024 * 1024;
        logParams['sinceSeconds'] = 300;
        logParams['follow'] = true;
        const credentials = Buffer.from(`primary:${logStream["primaryKey"]}`).toString('base64');
        const auth = { "Authorization" : `Basic ${credentials}` };
        var url = new URL(streamingUrl)
        url.search = new URLSearchParams(logParams).toString();
        fetch(url, {method: 'GET', headers : auth })
            .then(response => {
            if (response.ok) {
              const stream = response.body;
              // Pipe the stream to stderr
              stream.pipe(process.stderr);
            } else {
              // Handle error response
              console.error('Error:', response.status, response.statusText);
            }
          })
          .catch(error => {
            // Handle network error
            console.error('Error:', error.message);
          });;
    }

    private static async deployWithLog(client: asa.AppPlatformManagementClient, params: ActionParameters, deploymentResource: asa.DeploymentResource) {
        try {
            const response = await client.deployments.beginCreateOrUpdateAndWait(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName, deploymentResource);
            core.debug('deploy response: ' + JSON.stringify(response));
        } catch (e:any) {
            await this.printLatestAppInstanceLog(client, params);
            throw Error(e);
        }
    }
}
