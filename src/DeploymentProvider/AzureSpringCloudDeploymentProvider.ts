import * as core from '@actions/core';
import { v4 as uuidv4 } from 'uuid';
import { Package, PackageType } from 'azure-actions-utility/packageUtility';
import { Actions, ActionParameters, ActionParametersUtility } from '../operations/ActionParameters';
import { AppPlatformManagementClient, AppPlatformManagementModels as Models } from '@azure/arm-appplatform'
import { getDefaultAzureCredential } from '@azure/identity'
import { DeploymentHelper as dh } from "./DeploymentHelper";
import * as tar from 'tar';

export class AzureSpringCloudDeploymentProvider {

    defaultInactiveDeploymentName = 'staging';

    params: ActionParameters;
    client: AppPlatformManagementClient;
    logDetail: string;

    constructor() {
        this.params = ActionParametersUtility.getParameters();
    }

    public async preDeploymentStep() {
        const token = getDefaultAzureCredential();
        this.client = new AppPlatformManagementClient(token, this.params.azureSubscription);
        const serviceList = await this.client.services.listBySubscription();
        let filteredResources: Array<Models.ServiceResource> = [];
        serviceList.forEach(service => {
            if (service.name == this.params.serviceName) {
                filteredResources.push(service);
            }
        });
        if (!filteredResources || filteredResources.length == 0) {
            throw new Error('ResourceDoesntExist: ' + this.params.serviceName);
        } else if (filteredResources.length == 1) {
            const reg = new RegExp('(?<=/resourceGroups/).*?(?=/providers/Microsoft.AppPlatform/Spring/)', 'i')
            const match = filteredResources[0].id.match(reg);
            if (!match || match.length != 1) {
                throw new Error('ResourceGroupNameParseErrorWithId:' + filteredResources[0].id);
            }
            this.params.resourceGroupName = match[0];
            console.log('service resource group name: ' + this.params.resourceGroupName);
        } else { //Should never ever ever happen
            throw new Error('DuplicateAzureSpringCloudName: ' + this.params.serviceName);
        }
        const serviceResponse = await this.client.services.get(this.params.resourceGroupName, this.params.serviceName);
        core.debug("service response: " + serviceResponse._response.bodyAsText);
        if (serviceResponse._response.status != 200) {
            throw Error('GetServiceError: ' + this.params.serviceName);
        }
        this.logDetail = `service ${this.params.serviceName} app ${this.params.appName}`;
    }

    public async deployAppStep() {
        switch (this.params.action) {

            case Actions.DEPLOY: {
                await this.performDeployAction();
                break;
            }

            case Actions.SET_PRODUCTION: {
                await this.performSetProductionAction();
                break;
            }

            case Actions.DELETE_STAGING_DEPLOYMENT: {
                await this.performDeleteStagingDeploymentAction();
                break;
            }

            default:
                throw Error('UnknownOrUnsupportedAction: ' + this.params.action);
        }
    }

    private async performDeleteStagingDeploymentAction() {
        let deploymentName = this.params.deploymentName;
        if (!deploymentName) {
            deploymentName = await dh.getStagingDeploymentName(this.client, this.params);
            this.params.deploymentName = deploymentName;
        }
        if (deploymentName) {
            console.log(`Delete staging deployment action for ${this.logDetail} to deployment ${deploymentName}.`);
            await dh.deleteDeployment(this.client, this.params);
        } else {
            throw Error(`No staging deployment in ${this.logDetail}`);
        }
        console.log(`Delete staging deployment action successful for ${this.logDetail} to deployment ${deploymentName}..`);
        return deploymentName;
    }

    private async performSetProductionAction() {
        let deploymentName: string;
        if (this.params.deploymentName) {
            console.log(`Set production action for ${this.logDetail} to the specific deployment ${this.params.deploymentName}`);
            deploymentName = this.params.deploymentName;
            let existingStagingDeploymentNames: Array<string> = await dh.getStagingDeploymentNames(this.client, this.params);
            if (!existingStagingDeploymentNames.includes(deploymentName)) {
                throw Error(`Staging deployment ${deploymentName} not exist in ${this.logDetail}.`);
            }
            await dh.setActiveDeployment(this.client, this.params);
        } else if (this.params.useStagingDeployment) {
            console.log(`Set production deployment for ${this.logDetail} to the current inactive deployment.`);
            deploymentName = await dh.getStagingDeploymentName(this.client, this.params);
            this.params.deploymentName = deploymentName;
            if (!deploymentName) { //If no inactive deployment exists, we cannot continue as instructed.
                throw Error(`No staging deployment in ${this.logDetail}`);
            }
            await dh.setActiveDeployment(this.client, this.params);
        } else {
            throw Error(`Set production deployment action should use-staging-deployment or specify deployment-name`);
        }

        console.log(`Set production action successful for ${this.logDetail} to deployment ${deploymentName}.`);
    }

    private async performDeployAction() {
        let sourceType: string = this.determineSourceType(this.params.Package);
        //If uploading a source folder, compress to tar.gz file.
        let fileToUpload: string = sourceType == SourceType.SOURCE_DIRECTORY
            ? await this.compressSourceDirectory(this.params.Package.getPath())
            : this.params.Package.getPath();
        let deploymentName: string;

        if (this.params.deploymentName) {
            console.log(`Deploying for ${this.logDetail} to deployment ${this.params.deploymentName}.`);
            deploymentName = this.params.deploymentName;
            let deploymentNames: Array<string> = await dh.getAllDeploymentsName(this.client, this.params);
            if (!deploymentNames || !deploymentNames.includes(deploymentName)) {
                console.log(`Deployment ${deploymentName} does not exist`);
                if (this.params.createNewDeployment) {
                    if (deploymentNames.length > 1) {
                        throw Error(`More than 1 deployments already exist in ${this.logDetail}: ${JSON.stringify(deploymentNames)}`);
                    } else {
                        console.log(`New Deployment will be created for ${this.logDetail}.`);
                    }
                } else {
                    throw Error(`Deployment ${deploymentName} doesn\'t exist in ${this.logDetail}`);
                }
            }
        } else if (this.params.useStagingDeployment) {
            deploymentName = await dh.getStagingDeploymentName(this.client, this.params);
            if (!deploymentName) { //If no inactive deployment exists
                console.log(`No staging deployment was found in ${this.logDetail}.`);
                if (this.params.createNewDeployment) {
                    console.log(`New deployment ${this.defaultInactiveDeploymentName} will be created in ${this.logDetail}`);
                    deploymentName = this.defaultInactiveDeploymentName; //Create a new deployment with the default name.
                    this.params.deploymentName = deploymentName;
                } else
                    throw Error(`No staging deployment in ${this.logDetail}`);
            }
        } else {
            deploymentName = await dh.getProductionDeploymentName(this.client, this.params);
            this.params.deploymentName = deploymentName;
            if(!deploymentName) {
                throw Error(`Production deployment does not exist in ${this.logDetail}.`);
            }
        }

        await dh.deploy(this.client, this.params, sourceType, fileToUpload);
        console.log(`Deploy action successful for ${this.logDetail} to deployment ${deploymentName}.`);

    }

    /**
     * Compresses sourceDirectoryPath into a tar.gz
     * @param sourceDirectoryPath
     */
    //todo pack source code ignore some files
    async compressSourceDirectory(sourceDirectoryPath: string): Promise<string> {
        const fileName = `${uuidv4()}.tar.gz`;
        core.debug(`CompressingSourceDirectory ${sourceDirectoryPath} ${fileName}`);
        await tar.c({
            gzip: true,
            file: fileName,
            sync: true,
            cwd: sourceDirectoryPath,
            onWarn: warning => {
                core.warning(warning);
            }
        }, ['.']);
        return fileName;
    }

    private determineSourceType(pkg: Package): string {
        var sourceType: string;
        switch (pkg.getPackageType()) {
            case PackageType.folder:
                sourceType = SourceType.SOURCE_DIRECTORY;
                break;
            case PackageType.zip:
                sourceType = SourceType.DOT_NET_CORE_ZIP;
                break;
            case PackageType.jar:
                sourceType = SourceType.JAR;
                break;
            default:
                throw Error('UnsupportedSourceType: ' + pkg.getPath());
        }
        return sourceType;
    }
}

export const SourceType = {
    JAR: "Jar",
    SOURCE_DIRECTORY: "Source",
    DOT_NET_CORE_ZIP: "NetCoreZip"
}
