"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceType = exports.AzureSpringAppsDeploymentProvider = void 0;
const core = __importStar(require("@actions/core"));
const uuid_1 = require("uuid");
const packageUtility_1 = require("azure-actions-utility/packageUtility");
const ActionParameters_1 = require("../operations/ActionParameters");
const asa = __importStar(require("@azure/arm-appplatform"));
const identity_1 = require("@azure/identity");
const DeploymentHelper_1 = require("./DeploymentHelper");
const tar = __importStar(require("tar"));
class AzureSpringAppsDeploymentProvider {
    constructor() {
        this.defaultInactiveDeploymentName = 'staging';
        this.params = ActionParameters_1.ActionParametersUtility.getParameters();
    }
    preDeploymentStep() {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function* () {
            const token = (0, identity_1.getDefaultAzureCredential)();
            this.client = new asa.AppPlatformManagementClient(token, this.params.azureSubscription);
            const serviceList = yield this.client.services.listBySubscription();
            let filteredResources = [];
            try {
                for (var serviceList_1 = __asyncValues(serviceList), serviceList_1_1; serviceList_1_1 = yield serviceList_1.next(), !serviceList_1_1.done;) {
                    const service = serviceList_1_1.value;
                    if (service.name == this.params.serviceName) {
                        filteredResources.push(service);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (serviceList_1_1 && !serviceList_1_1.done && (_a = serviceList_1.return)) yield _a.call(serviceList_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (!filteredResources || filteredResources.length == 0) {
                throw new Error('ResourceDoesntExist: ' + this.params.serviceName);
            }
            else if (filteredResources.length == 1) {
                const reg = new RegExp('(?<=/resourceGroups/).*?(?=/providers/Microsoft.AppPlatform/Spring/)', 'i');
                const match = filteredResources[0].id.match(reg);
                if (!match || match.length != 1) {
                    throw new Error('ResourceGroupNameParseErrorWithId:' + filteredResources[0].id);
                }
                this.params.resourceGroupName = match[0];
                console.log('service resource group name: ' + this.params.resourceGroupName);
            }
            else { //Should never ever ever happen
                throw new Error('DuplicateAzureSpringAppsName: ' + this.params.serviceName);
            }
            const serviceResponse = yield this.client.services.get(this.params.resourceGroupName, this.params.serviceName);
            core.debug("service response: " + JSON.stringify(serviceResponse));
            // if (serviceResponse._response.status != 200) {
            //     throw Error('GetServiceError: ' + this.params.serviceName);
            // }
            this.logDetail = `service ${this.params.serviceName} app ${this.params.appName}`;
        });
    }
    deployAppStep() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.params.action) {
                case ActionParameters_1.Actions.DEPLOY: {
                    yield this.performDeployAction();
                    break;
                }
                case ActionParameters_1.Actions.SET_PRODUCTION: {
                    yield this.performSetProductionAction();
                    break;
                }
                case ActionParameters_1.Actions.DELETE_STAGING_DEPLOYMENT: {
                    yield this.performDeleteStagingDeploymentAction();
                    break;
                }
                default:
                    throw Error('UnknownOrUnsupportedAction: ' + this.params.action);
            }
        });
    }
    performDeleteStagingDeploymentAction() {
        return __awaiter(this, void 0, void 0, function* () {
            let deploymentName = this.params.deploymentName;
            if (!deploymentName) {
                deploymentName = yield DeploymentHelper_1.DeploymentHelper.getStagingDeploymentName(this.client, this.params);
                this.params.deploymentName = deploymentName;
            }
            if (deploymentName) {
                console.log(`Delete staging deployment action for ${this.logDetail} to deployment ${deploymentName}.`);
                yield DeploymentHelper_1.DeploymentHelper.deleteDeployment(this.client, this.params);
            }
            else {
                throw Error(`No staging deployment in ${this.logDetail}`);
            }
            console.log(`Delete staging deployment action successful for ${this.logDetail} to deployment ${deploymentName}..`);
            return deploymentName;
        });
    }
    performSetProductionAction() {
        return __awaiter(this, void 0, void 0, function* () {
            let deploymentName;
            if (this.params.deploymentName) {
                console.log(`Set production action for ${this.logDetail} to the specific deployment ${this.params.deploymentName}`);
                deploymentName = this.params.deploymentName;
                let existingStagingDeploymentNames = yield DeploymentHelper_1.DeploymentHelper.getStagingDeploymentNames(this.client, this.params);
                if (!existingStagingDeploymentNames.includes(deploymentName)) {
                    throw Error(`Staging deployment ${deploymentName} not exist in ${this.logDetail}.`);
                }
                yield DeploymentHelper_1.DeploymentHelper.setActiveDeployment(this.client, this.params);
            }
            else if (this.params.useStagingDeployment) {
                console.log(`Set production deployment for ${this.logDetail} to the current inactive deployment.`);
                deploymentName = yield DeploymentHelper_1.DeploymentHelper.getStagingDeploymentName(this.client, this.params);
                this.params.deploymentName = deploymentName;
                if (!deploymentName) { //If no inactive deployment exists, we cannot continue as instructed.
                    throw Error(`No staging deployment in ${this.logDetail}`);
                }
                yield DeploymentHelper_1.DeploymentHelper.setActiveDeployment(this.client, this.params);
            }
            else {
                throw Error(`Set production deployment action should use-staging-deployment or specify deployment-name`);
            }
            console.log(`Set production action successful for ${this.logDetail} to deployment ${deploymentName}.`);
        });
    }
    performDeployAction() {
        return __awaiter(this, void 0, void 0, function* () {
            let sourceType = this.determineSourceType(this.params.Package);
            //If uploading a source folder, compress to tar.gz file.
            let fileToUpload = sourceType == exports.SourceType.SOURCE_DIRECTORY
                ? yield this.compressSourceDirectory(this.params.Package.getPath())
                : this.params.Package.getPath();
            let deploymentName;
            if (this.params.deploymentName) {
                console.log(`Deploying for ${this.logDetail} to deployment ${this.params.deploymentName}.`);
                deploymentName = this.params.deploymentName;
                let deploymentNames = yield DeploymentHelper_1.DeploymentHelper.getAllDeploymentsName(this.client, this.params);
                if (!deploymentNames || !deploymentNames.includes(deploymentName)) {
                    console.log(`Deployment ${deploymentName} does not exist`);
                    if (this.params.createNewDeployment) {
                        if (deploymentNames.length > 1) {
                            throw Error(`More than 1 deployments already exist in ${this.logDetail}: ${JSON.stringify(deploymentNames)}`);
                        }
                        else {
                            console.log(`New Deployment will be created for ${this.logDetail}.`);
                        }
                    }
                    else {
                        throw Error(`Deployment ${deploymentName} doesn\'t exist in ${this.logDetail}`);
                    }
                }
            }
            else if (this.params.useStagingDeployment) {
                console.log(`Deploying to the staging deployment of ${this.logDetail}.`);
                deploymentName = yield DeploymentHelper_1.DeploymentHelper.getStagingDeploymentName(this.client, this.params);
                if (!deploymentName) { //If no inactive deployment exists
                    console.log(`No staging deployment was found in ${this.logDetail}.`);
                    if (this.params.createNewDeployment) {
                        console.log(`New deployment ${this.defaultInactiveDeploymentName} will be created in ${this.logDetail}`);
                        deploymentName = this.defaultInactiveDeploymentName; //Create a new deployment with the default name.
                        this.params.deploymentName = deploymentName;
                    }
                    else
                        throw Error(`No staging deployment in ${this.logDetail}`);
                }
            }
            else {
                console.log(`Deploying to the production deployment of ${this.logDetail}.`);
                deploymentName = yield DeploymentHelper_1.DeploymentHelper.getProductionDeploymentName(this.client, this.params);
                this.params.deploymentName = deploymentName;
                if (!deploymentName) {
                    throw Error(`Production deployment does not exist in ${this.logDetail}.`);
                }
            }
            yield DeploymentHelper_1.DeploymentHelper.deploy(this.client, this.params, sourceType, fileToUpload);
            console.log(`Deploy action successful for ${this.logDetail} to deployment ${deploymentName}.`);
        });
    }
    /**
     * Compresses sourceDirectoryPath into a tar.gz
     * @param sourceDirectoryPath
     */
    //todo pack source code ignore some files
    compressSourceDirectory(sourceDirectoryPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileName = `${(0, uuid_1.v4)()}.tar.gz`;
            core.debug(`CompressingSourceDirectory ${sourceDirectoryPath} ${fileName}`);
            yield tar.c({
                gzip: true,
                file: fileName,
                sync: true,
                cwd: sourceDirectoryPath,
                onWarn: warning => {
                    core.warning(warning);
                }
            }, ['.']);
            return fileName;
        });
    }
    determineSourceType(pkg) {
        var sourceType;
        switch (pkg.getPackageType()) {
            case packageUtility_1.PackageType.folder:
                sourceType = exports.SourceType.SOURCE_DIRECTORY;
                break;
            case packageUtility_1.PackageType.zip:
                sourceType = exports.SourceType.DOT_NET_CORE_ZIP;
                break;
            case packageUtility_1.PackageType.jar:
                sourceType = exports.SourceType.JAR;
                break;
            default:
                throw Error('UnsupportedSourceType: ' + pkg.getPath());
        }
        return sourceType;
    }
}
exports.AzureSpringAppsDeploymentProvider = AzureSpringAppsDeploymentProvider;
exports.SourceType = {
    JAR: "Jar",
    SOURCE_DIRECTORY: "Source",
    DOT_NET_CORE_ZIP: "NetCoreZip"
};
