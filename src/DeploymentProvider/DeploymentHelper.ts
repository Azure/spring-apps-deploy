import { Actions, ActionParameters } from '../operations/ActionParameters';
import * as asa from '@azure/arm-appplatform'
import { uploadFileToSasUrl } from "./azure-storage";
import * as core from "@actions/core";
import { parse } from 'azure-actions-utility/parameterParserUtility';

export class DeploymentHelper {

    private static readonly CREATE_OR_UPDATE_SUCCESS_CODE: Array<number> = [200];
    private static readonly DELETE_SUCCESS_CODE: Array<number> = [200, 204];
    private static readonly GET_SUCCESS_CODE: Array<number> = [200];

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
        // let appResource: asa.AppResource = {
        //     properties: {
        //         activeDeploymentName: params.deploymentName
        //     }
        // };
        let activeDeploymentCollection: asa.ActiveDeploymentCollection = {
            activeDeploymentNames: [params.deploymentName]
        }
        const setActiveResponse: asa.AppsUpdateResponse = await client.apps.beginSetActiveDeploymentsAndWait(params.resourceGroupName, params.serviceName, params.appName, activeDeploymentCollection);
        core.debug('set active deployment response: ' + JSON.stringify(setActiveResponse));
        // if (!this.CREATE_OR_UPDATE_SUCCESS_CODE.includes(updateResponse._response.status)) {
        //     throw Error('SetActiveDeploymentError');
        // }
        return;
    }

    public static async deploy(client: asa.AppPlatformManagementClient, params: ActionParameters, sourceType: string, fileToUpload: string) {
        let uploadResponse: asa.AppsGetResourceUploadUrlResponse = await client.apps.getResourceUploadUrl(params.resourceGroupName, params.serviceName, params.appName);
        core.debug('request upload url response: ' +  JSON.stringify(uploadResponse));
        // if (!this.GET_SUCCESS_CODE.includes(uploadResponse._response.status)) {
        //     throw Error('RequestUploadUrlError');
        // }
        await uploadFileToSasUrl(uploadResponse.uploadUrl, fileToUpload);
        let getDeploymentName = params.deploymentName;
        if (params.createNewDeployment) {
            getDeploymentName = await this.getProductionDeploymentName(client, params);
        }
        let getResponse: asa.DeploymentResource = await this.getDeployment(client, params, getDeploymentName);
        let deploymentResource: asa.DeploymentResource;
        let sourcePart: asa.UploadedUserSourceInfoUnion = {
            relativePath: uploadResponse.relativePath,
            type: sourceType as "UploadedUserSourceInfo" | "Jar" | "Source" | "NetCoreZip"
        };
        if(params.version) {
            sourcePart.version = params.version;
        }
        let deploymentSettingsPart: asa.DeploymentSettings = {
        };
        if (params.jvmOptions) {
            (<asa.JarUploadedUserSourceInfo> sourcePart).jvmOptions = params.jvmOptions;
        }
        if (params.dotNetCoreMainEntryPath) {
            (<asa.NetCoreZipUploadedUserSourceInfo> deploymentSettingsPart).netCoreMainEntryPath = params.dotNetCoreMainEntryPath;
        }
        if (params.runtimeVersion) {
            (<asa.JarUploadedUserSourceInfo | asa.NetCoreZipUploadedUserSourceInfo> sourcePart).runtimeVersion = params.runtimeVersion;
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
        const response = await client.deployments.beginCreateOrUpdateAndWait(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName, deploymentResource);
        core.debug('deploy response: ' + JSON.stringify(response));
        // if (!this.CREATE_OR_UPDATE_SUCCESS_CODE.includes(response._response.status)) {
        //     throw Error('DeployError');
        // }
        return;
    }

    public static async deleteDeployment(client: asa.AppPlatformManagementClient, params: ActionParameters) {
        const response = await client.deployments.beginDeleteAndWait(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName);
        core.debug('delete deployment response: ' + JSON.stringify(response));
        // if (!this.DELETE_SUCCESS_CODE.includes(response._response.status)) {
        //     throw Error('DeleteDeploymentError');
        // }
        return;
    }
}
