import { Actions, ActionParameters } from '../operations/ActionParameters';
import * as asa from '@azure/arm-appplatform'
import { uploadFileToSasUrl } from "./azure-storage";
import * as core from "@actions/core";
import { parse } from 'azure-actions-utility/parameterParserUtility';
import {UserSourceInfoUnion} from "@azure/arm-appplatform";

export class DeploymentHelper {

    private static listDeploymentsResult: Array<asa.DeploymentResource> = [];

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
        const response = await client.deployments.beginCreateOrUpdateAndWait(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName, deploymentResource);
        core.debug('deploy response: ' + JSON.stringify(response));
        return;
    }

    public static async deployEnterprise(client: asa.AppPlatformManagementClient, params: ActionParameters, sourceType: string, fileToUpload: string, resourceId: string) {
        core.debug('Starting deploy for enterprise');
        const uploadResponse = await client.buildServiceOperations.getResourceUploadUrl(params.resourceGroupName, params.serviceName, params.appName);
        core.debug('request upload url response: ' +  JSON.stringify(uploadResponse));
        await uploadFileToSasUrl(uploadResponse.uploadUrl, fileToUpload);
        const buildServiceName = "default";
        const build: asa.Build = {
            properties: {
                relativePath: uploadResponse.relativePath,
                builder: params.builder ? params.builder : `${resourceId}/buildServices/${buildServiceName}/builders/default`,
                agentPool: `${resourceId}/buildServices/default/agentPools/default`,
            }
        };
        if (params.buildEnv) {
            const parsedBuildEnvVariables = parse(params.buildEnv);
            core.debug('Environment Variables: ' + JSON.stringify(parsedBuildEnvVariables));
            build.properties.env = parsedBuildEnvVariables;
        }
        const buildResponse = await client.buildServiceOperations.createOrUpdateBuild(params.resourceGroupName, params.serviceName, "default", params.appName, build);
        core.debug('build response: ' +  JSON.stringify(buildResponse));
        const waitResponse = await client.buildServiceOperations.getBuildResult(params.resourceGroupName, params.serviceName, "default", params.appName, buildResponse.properties.triggeredBuildResult.id);
        core.debug('build result response: ' +  JSON.stringify(waitResponse));
        let deploymentResource: asa.DeploymentResource = await this.buildDeploymentResource(client, params, sourceType, buildResponse.properties.triggeredBuildResult.id);
        core.debug("deploymentResource: " + JSON.stringify(deploymentResource));
        const deployResponse = await client.deployments.beginCreateOrUpdateAndWait(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName, deploymentResource);
        core.debug('deploy response: ' + JSON.stringify(deployResponse));

    }

    public static async deleteDeployment(client: asa.AppPlatformManagementClient, params: ActionParameters) {
        const response = await client.deployments.beginDeleteAndWait(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName);
        core.debug('delete deployment response: ' + JSON.stringify(response));
        return;
    }

    protected static async buildDeploymentResource(client: asa.AppPlatformManagementClient, params: ActionParameters, sourceType: string, idOrPath: string): Promise<asa.DeploymentResource> {
        let getDeploymentName = params.deploymentName;
        if (params.createNewDeployment) {
            getDeploymentName = await this.getProductionDeploymentName(client, params);
        }
        let getResponse: asa.DeploymentResource = await this.getDeployment(client, params, getDeploymentName);
        let deploymentResource: asa.DeploymentResource;
        let sourcePart: {};
        if (sourceType == "BuildResult") {
            sourcePart = {
                buildResultId: idOrPath,
                type: "BuildResult"
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
        if (params.jvmOptions) {
            sourcePart["jvmOptions"] = params.jvmOptions;
        }
        if (params.dotNetCoreMainEntryPath) {
            deploymentSettingsPart["netCoreMainEntryPath"] = params.dotNetCoreMainEntryPath;
        }
        if (params.runtimeVersion) {
            sourcePart["runtimeVersion"] = params.runtimeVersion;
        }
        if (params.configFilePatterns) {
            deploymentSettingsPart["addonConfigs"]["applicationConfigurationService"]["configFilePatterns"] = params.configFilePatterns;
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
        if (getResponse) {
            let source = {...getResponse.properties.source, ...sourcePart};
            let deploymentSettings = {...getResponse.properties.deploymentSettings, ...deploymentSettingsPart};
            deploymentResource = {
                properties: {
                    source: source as UserSourceInfoUnion,
                    deploymentSettings: deploymentSettings
                },
                sku: getResponse.sku
            };
        } else {
            deploymentResource = {
                properties: {
                    source: sourcePart as UserSourceInfoUnion,
                    deploymentSettings: deploymentSettingsPart
                }
            };
        }
        return deploymentResource;
    }
}
