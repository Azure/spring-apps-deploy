import { Actions, ActionParameters } from '../operations/ActionParameters';
import { AppPlatformManagementClient, AppPlatformManagementModels as Models } from '@azure/arm-appplatform'
import { uploadFileToSasUrl } from "./azure-storage";
import * as core from "@actions/core";
import { parse } from 'azure-actions-utility/parameterParserUtility';

export class DeploymentHelper {

    private static readonly CREATE_OR_UPDATE_SUCCESS_CODE: Array<number> = [200];
    private static readonly DELETE_SUCCESS_CODE: Array<number> = [200, 204];
    private static readonly GET_SUCCESS_CODE: Array<number> = [200];

    private static listDeploymentsResult: Models.DeploymentsListResponse = null;

    private static async listDeployments(client: AppPlatformManagementClient, params: ActionParameters): Promise<Models.DeploymentsListResponse> {
        if (this.listDeploymentsResult != null) {
            core.debug('list from cache, list deployments response: ' + this.listDeploymentsResult._response.bodyAsText);
            return this.listDeploymentsResult;
        }
        const deployments: Models.DeploymentsListResponse = await client.deployments.list(params.resourceGroupName, params.serviceName, params.appName);
        core.debug('list deployments response: ' + deployments._response.bodyAsText);
        if (!this.GET_SUCCESS_CODE.includes(deployments._response.status)) {
            throw Error('ListDeploymentsError');
        }
        this.listDeploymentsResult = deployments;
        return deployments;
    }

    private static async getDeployment(client: AppPlatformManagementClient, params: ActionParameters, deploymentName: string): Promise<Models.DeploymentResource> {
        if (this.listDeploymentsResult != null) {
            core.debug('get from list cache, list deployments response: ' + this.listDeploymentsResult._response.bodyAsText);
            let ret: Models.DeploymentResource;
            this.listDeploymentsResult.forEach(deployment => {
                core.debug('deployment str: ' + JSON.stringify(deployment));
                if (deployment.name == deploymentName) {
                    ret = deployment;
                }
            });
            return ret;
        }
        const getResponse: Models.DeploymentsGetResponse = await client.deployments.get(params.resourceGroupName, params.serviceName, params.appName, deploymentName);
        core.debug('get deployments response: ' + getResponse._response.bodyAsText);
        if (!this.GET_SUCCESS_CODE.includes(getResponse._response.status)) {
            throw Error('GetDeploymentsError');
        }
        return getResponse;
    }

    public static async getStagingDeploymentNames(client: AppPlatformManagementClient, params: ActionParameters): Promise<Array<string>> {
        const deployments: Models.DeploymentsListResponse = await this.listDeployments(client, params);
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

    public static async getStagingDeploymentName(client: AppPlatformManagementClient, params: ActionParameters): Promise<string> {
        let deploymentNames: Array<string> = await this.getStagingDeploymentNames(client, params);
        if (deploymentNames.length >= 2) {
            throw Error('More than 1 staging deployments were found: ' + JSON.stringify(deploymentNames));
        } else if (deploymentNames.length == 0) {
            return null;
        }
        return deploymentNames[0];
    }

    public static async getProductionDeploymentName(client: AppPlatformManagementClient, params: ActionParameters): Promise<string> {
        const deployments: Models.DeploymentsListResponse = await this.listDeployments(client, params);
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

    public static async getAllDeploymentsName(client: AppPlatformManagementClient, params: ActionParameters): Promise<Array<string>> {
        let names: Array<string> = [];
        const deployments: Models.DeploymentsListResponse = await this.listDeployments(client, params);
        deployments.forEach(deployment => {
            names.push(deployment.name);
        });
        return names;
    }

    public static async setActiveDeployment(client: AppPlatformManagementClient, params: ActionParameters) {
        let appResource: Models.AppResource = {
            properties: {
                activeDeploymentName: params.deploymentName
            }
        };
        const updateResponse: Models.AppsUpdateResponse = await client.apps.update(params.resourceGroupName, params.serviceName, params.appName, appResource);
        core.debug('set active deployment response: ' + updateResponse._response.bodyAsText);
        if (!this.CREATE_OR_UPDATE_SUCCESS_CODE.includes(updateResponse._response.status)) {
            throw Error('SetActiveDeploymentError');
        }
        return;
    }

    public static async deploy(client: AppPlatformManagementClient, params: ActionParameters, sourceType: string, fileToUpload: string) {
        let uploadResponse: Models.AppsGetResourceUploadUrlResponse = await client.apps.getResourceUploadUrl(params.resourceGroupName, params.serviceName, params.appName);
        core.debug('request upload url response: ' + uploadResponse._response.bodyAsText);
        if (!this.GET_SUCCESS_CODE.includes(uploadResponse._response.status)) {
            throw Error('RequestUploadUrlError');
        }
        await uploadFileToSasUrl(uploadResponse.uploadUrl, fileToUpload);
        let getDeploymentName = params.deploymentName;
        if (params.createNewDeployment) {
            getDeploymentName = await this.getProductionDeploymentName(client, params);
        }
        let getResponse: Models.DeploymentResource = await this.getDeployment(client, params, getDeploymentName);
        let deploymentResource: Models.DeploymentResource;
        let sourcePart: Models.UserSourceInfo = {
            relativePath: uploadResponse.relativePath,
            type: sourceType as Models.UserSourceType
        };
        if(params.version) {
            sourcePart.version = params.version;
        }
        let deploymentSettingsPart: Models.DeploymentSettings = {
        };
        if (params.jvmOptions) {
            deploymentSettingsPart.jvmOptions = params.jvmOptions;
        }
        if (params.dotNetCoreMainEntryPath) {
            deploymentSettingsPart.netCoreMainEntryPath = params.dotNetCoreMainEntryPath;
        }
        if (params.runtimeVersion) {
            deploymentSettingsPart.runtimeVersion = params.runtimeVersion as Models.RuntimeVersion;
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
            deploymentSettingsPart.environmentVariables = transformedEnvironmentVariables;
        }
        if (getResponse) {
            let source = {...getResponse.properties.source, ...sourcePart};
            let deploymentSettings = {...getResponse.properties.deploymentSettings, ...deploymentSettingsPart};
            deploymentResource = {
                properties: {
                    source: source,
                    deploymentSettings: deploymentSettings
                },
                sku: getResponse.sku
            };
        } else {
            deploymentResource = {
                properties: {
                    source: sourcePart,
                    deploymentSettings: deploymentSettingsPart
                }
            };
        }
        core.debug("deploymentResource: " + JSON.stringify(deploymentResource));
        const response = await client.deployments.createOrUpdate(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName, deploymentResource);
        core.debug('deploy response: ' + response._response.bodyAsText);
        if (!this.CREATE_OR_UPDATE_SUCCESS_CODE.includes(response._response.status)) {
            throw Error('DeployError');
        }
        return;
    }

    public static async deleteDeployment(client: AppPlatformManagementClient, params: ActionParameters) {
        const response = await client.deployments.deleteMethod(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName);
        core.debug('delete deployment response: ' + response._response.bodyAsText);
        if (!this.DELETE_SUCCESS_CODE.includes(response._response.status)) {
            throw Error('DeleteDeploymentError');
        }
        return;
    }
}
