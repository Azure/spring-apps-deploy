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
        this.logDetail = `for service ${this.params.serviceName} app ${this.params.appName}`;
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
        const deploymentName = await dh.getStagingDeploymentName(this.client, this.params);
        this.params.deploymentName = deploymentName;
        if (deploymentName) {
            console.log(`Delete staging deployment action ${this.logDetail} to deployment ${deploymentName}.`);
            await dh.deleteDeployment(this.client, this.params);
        } else {
            throw Error(`No staging deployment ${this.logDetail}`);
        }
        console.log('Delete staging deployment action successful.');
        return deploymentName;
    }

    private async performSetProductionAction() {
        let deploymentName: string;
        if (this.params.useStagingDeployment) {
            console.log('Set production deployment to the current inactive deployment.');
            deploymentName = await dh.getStagingDeploymentName(this.client, this.params);
            this.params.deploymentName = deploymentName;
            if (!deploymentName) { //If no inactive deployment exists, we cannot continue as instructed.
                throw Error(`No staging deployment ${this.logDetail}`);
            }
        } else {
            //Verify that the named deployment actually exists.
            console.log('Set production deployment to the specific deployment name.');
            deploymentName = this.params.deploymentName;
            let existingStagingDeploymentName: string = await dh.getStagingDeploymentName(this.client, this.params);
            if (deploymentName != existingStagingDeploymentName) {
                throw Error(`Staging deployment with name not exist ${this.logDetail} to deployment ${deploymentName}.`);
            }
        }
        console.log(`Set production action ${this.logDetail} to deployment ${deploymentName}`);
        await dh.setActiveDeployment(this.client, this.params);
        console.log('Set production action successful.');
    }

    private async performDeployAction() {
        let sourceType: string = this.determineSourceType(this.params.Package);

        //If uploading a source folder, compress to tar.gz file.
        let fileToUpload: string = sourceType == SourceType.SOURCE_DIRECTORY
            ? await this.compressSourceDirectory(this.params.Package.getPath())
            : this.params.Package.getPath();


        let deploymentName: string;
        if (this.params.useStagingDeployment) {
            deploymentName = await dh.getStagingDeploymentName(this.client, this.params);

            if (!deploymentName) { //If no inactive deployment exists
                console.log('No inactive deployment exists when deploying.');
                if (this.params.createNewDeployment) {
                    console.log('New deployment will be created');
                    deploymentName = this.defaultInactiveDeploymentName; //Create a new deployment with the default name.
                    this.params.deploymentName = deploymentName;
                } else
                    throw Error(`No staging deployment ${this.logDetail}`);
            }
        } else { //Deploy to deployment with specified name
            console.log('Deploying with specified name.');
            deploymentName = this.params.deploymentName;
            let deploymentNames: Array<string> = await dh.getAllDeploymentsName(this.client, this.params);
            if (!deploymentNames || !deploymentNames.includes(deploymentName)) {
                console.log(`Deployment ${deploymentName} does not exist`);
                if (this.params.createNewDeployment) {
                    if (deploymentNames.length > 1) {
                        throw Error(`Two deployments already exist ${this.logDetail}`);
                    } else {
                        console.log('New Deployment will be created.');
                    }
                } else {
                    throw Error(`Deployment doesn\'t exist ${this.logDetail} to deployment ${deploymentName}`);
                }

            }
        }

        console.log(`Deploy for service ${this.params.serviceName} app ${this.params.appName} to deployment ${deploymentName}.`);
        await dh.deploy(this.client, this.params, sourceType, fileToUpload);
        console.log('Deploy action successful.');

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
