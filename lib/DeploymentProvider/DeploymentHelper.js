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
exports.DeploymentHelper = void 0;
const azure_storage_1 = require("./azure-storage");
const core = __importStar(require("@actions/core"));
const parameterParserUtility_1 = require("azure-actions-utility/parameterParserUtility");
const AzureSpringAppsDeploymentProvider_1 = require("./AzureSpringAppsDeploymentProvider");
class DeploymentHelper {
    static listDeployments(client, params) {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (this.listDeploymentsResult.length > 0) {
                core.debug('list from cache, list deployments response: ' + JSON.stringify(this.listDeploymentsResult));
                return this.listDeploymentsResult;
            }
            const deployments = yield client.deployments.list(params.resourceGroupName, params.serviceName, params.appName);
            try {
                for (var deployments_1 = __asyncValues(deployments), deployments_1_1; deployments_1_1 = yield deployments_1.next(), !deployments_1_1.done;) {
                    const deployment = deployments_1_1.value;
                    this.listDeploymentsResult.push(deployment);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (deployments_1_1 && !deployments_1_1.done && (_a = deployments_1.return)) yield _a.call(deployments_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            core.debug('list deployments response: ' + JSON.stringify(this.listDeploymentsResult));
            return this.listDeploymentsResult;
        });
    }
    static getDeployment(client, params, deploymentName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.listDeploymentsResult.length > 0) {
                core.debug('get from list cache, list deployments response: ' + JSON.stringify(this.listDeploymentsResult));
                let ret;
                this.listDeploymentsResult.forEach(deployment => {
                    core.debug('deployment str: ' + JSON.stringify(deployment));
                    if (deployment.name == deploymentName) {
                        ret = deployment;
                    }
                });
                return ret;
            }
            const getResponse = yield client.deployments.get(params.resourceGroupName, params.serviceName, params.appName, deploymentName);
            return getResponse;
        });
    }
    static getStagingDeploymentNames(client, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const deployments = yield this.listDeployments(client, params);
            let ret = [];
            deployments.forEach(deployment => {
                core.debug('deployment str: ' + JSON.stringify(deployment));
                if (deployment.properties.active == false) {
                    core.debug("inactive deployment name: " + deployment.name);
                    ret.push(deployment.name);
                }
                else {
                    core.debug("active deployment name: " + deployment.name);
                }
            });
            return ret;
        });
    }
    static getStagingDeploymentName(client, params) {
        return __awaiter(this, void 0, void 0, function* () {
            let deploymentNames = yield this.getStagingDeploymentNames(client, params);
            if (deploymentNames.length >= 2) {
                throw Error('More than 1 staging deployments were found: ' + JSON.stringify(deploymentNames));
            }
            else if (deploymentNames.length == 0) {
                return null;
            }
            return deploymentNames[0];
        });
    }
    static getProductionDeploymentName(client, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const deployments = yield this.listDeployments(client, params);
            let ret = [];
            deployments.forEach(deployment => {
                if (deployment.properties.active) {
                    ret.push(deployment.name);
                }
            });
            if (ret.length >= 2) {
                throw Error('More than 1 production deployments were found: ' + JSON.stringify(ret));
            }
            else if (ret.length == 0) {
                return null;
            }
            return ret[0];
        });
    }
    static getAllDeploymentsName(client, params) {
        return __awaiter(this, void 0, void 0, function* () {
            let names = [];
            const deployments = yield this.listDeployments(client, params);
            deployments.forEach(deployment => {
                names.push(deployment.name);
            });
            return names;
        });
    }
    static setActiveDeployment(client, params) {
        return __awaiter(this, void 0, void 0, function* () {
            let activeDeploymentCollection = {
                activeDeploymentNames: [params.deploymentName]
            };
            const setActiveResponse = yield client.apps.beginSetActiveDeploymentsAndWait(params.resourceGroupName, params.serviceName, params.appName, activeDeploymentCollection);
            core.debug('set active deployment response: ' + JSON.stringify(setActiveResponse));
            return;
        });
    }
    static deploy(client, params, sourceType, fileToUpload) {
        return __awaiter(this, void 0, void 0, function* () {
            let uploadResponse = yield client.apps.getResourceUploadUrl(params.resourceGroupName, params.serviceName, params.appName);
            core.debug('request upload url response: ' + JSON.stringify(uploadResponse));
            yield (0, azure_storage_1.uploadFileToSasUrl)(uploadResponse.uploadUrl, fileToUpload);
            let deploymentResource = yield this.buildDeploymentResource(client, params, sourceType, uploadResponse.relativePath);
            core.debug("deploymentResource: " + JSON.stringify(deploymentResource));
            const response = yield client.deployments.beginCreateOrUpdateAndWait(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName, deploymentResource);
            core.debug('deploy response: ' + JSON.stringify(response));
            return;
        });
    }
    static deployCustomContainer(client, params, sourceType) {
        return __awaiter(this, void 0, void 0, function* () {
            let deploymentResource = yield this.buildDeploymentResource(client, params, sourceType, null);
            core.debug("custom container deploymentResource: " + JSON.stringify(deploymentResource));
            const response = yield client.deployments.beginCreateOrUpdateAndWait(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName, deploymentResource);
            core.debug('custom container deploy response: ' + JSON.stringify(response));
            return;
        });
    }
    static deployEnterprise(client, params, sourceType, fileToUpload, resourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const buildServiceName = "default";
            const buildName = `${params.appName}-${params.deploymentName}`;
            const uploadResponse = yield client.buildServiceOperations.getResourceUploadUrl(params.resourceGroupName, params.serviceName, buildServiceName);
            core.debug('request upload url response: ' + JSON.stringify(uploadResponse));
            yield (0, azure_storage_1.uploadFileToSasUrl)(uploadResponse.uploadUrl, fileToUpload);
            const build = {
                properties: {
                    relativePath: uploadResponse.relativePath,
                    builder: params.builder ? `${resourceId}/buildServices/${buildServiceName}/builders/${params.builder}` : `${resourceId}/buildServices/${buildServiceName}/builders/default`,
                    agentPool: `${resourceId}/buildServices/${buildServiceName}/agentPools/default`,
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
                const parsedBuildEnvVariables = (0, parameterParserUtility_1.parse)(params.buildEnv);
                //Parsed pairs come back as  {"key1":{"value":"val1"},"key2":{"value":"val2"}}
                Object.keys(parsedBuildEnvVariables).forEach(key => {
                    transformedBuildEnvironmentVariables[key] = parsedBuildEnvVariables[key]['value'];
                });
                build.properties.env = transformedBuildEnvironmentVariables;
            }
            core.debug('build: ' + JSON.stringify(build));
            const buildResponse = yield client.buildServiceOperations.createOrUpdateBuild(params.resourceGroupName, params.serviceName, buildServiceName, buildName, build);
            core.debug('build response: ' + JSON.stringify(buildResponse));
            const regex = RegExp("[^/]+$");
            const buildResultName = regex.exec(buildResponse.properties.triggeredBuildResult.id)[0];
            let buildProvisioningState = 'Queuing';
            let cnt = 0;
            core.debug("wait for build result......");
            //Waiting for build result. Timeout 30 minutes.
            while (buildProvisioningState != 'Succeeded' && buildProvisioningState != 'Failed' && cnt++ < 180) {
                yield new Promise(resolve => setTimeout(resolve, 10000));
                console.log("wait for 10 seconds....");
                const waitResponse = yield client.buildServiceOperations.getBuildResult(params.resourceGroupName, params.serviceName, buildServiceName, buildName, buildResultName);
                core.debug('build result response: ' + JSON.stringify(waitResponse));
                buildProvisioningState = waitResponse.properties.provisioningState;
            }
            if (cnt == 180) {
                throw Error("Build result timeout.");
            }
            if (buildProvisioningState != 'Succeeded') {
                throw Error("Build result failed.");
            }
            let deploymentResource = yield this.buildDeploymentResource(client, params, sourceType, buildResponse.properties.triggeredBuildResult.id);
            core.debug("deploymentResource: " + JSON.stringify(deploymentResource));
            const deployResponse = yield client.deployments.beginCreateOrUpdateAndWait(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName, deploymentResource);
            core.debug('deploy response: ' + JSON.stringify(deployResponse));
        });
    }
    static deleteDeployment(client, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield client.deployments.beginDeleteAndWait(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName);
            core.debug('delete deployment response: ' + JSON.stringify(response));
            return;
        });
    }
    static buildDeploymentResource(client, params, sourceType, idOrPath) {
        return __awaiter(this, void 0, void 0, function* () {
            let getDeploymentName = params.deploymentName;
            if (params.createNewDeployment) {
                getDeploymentName = yield this.getProductionDeploymentName(client, params);
            }
            let getResponse = yield this.getDeployment(client, params, getDeploymentName);
            let deploymentResource;
            let sourcePart;
            if (sourceType == AzureSpringAppsDeploymentProvider_1.SourceType.CUSTOM_CONTAINER) {
                sourcePart = {
                    type: AzureSpringAppsDeploymentProvider_1.SourceType.CUSTOM_CONTAINER
                };
                let customContainer = {};
                let imageRegistryCredential = {};
                if (params.registryServer) {
                    customContainer.server = params.registryServer;
                }
                if (params.registryUsername || params.registryPassword) {
                    imageRegistryCredential.username = params.registryUsername;
                    imageRegistryCredential.password = params.registryPassword;
                    customContainer.imageRegistryCredential = imageRegistryCredential;
                }
                if (params.imageName) {
                    customContainer.containerImage = params.imageName;
                }
                if (params.imageCommand) {
                    customContainer.command = params.imageCommand.split(' ');
                }
                if (params.imageArgs) {
                    customContainer.args = params.imageArgs.split(' ');
                }
                if (params.imageLanguageFramework) {
                    customContainer.languageFramework = params.imageLanguageFramework;
                }
                sourcePart["customContainer"] = customContainer;
            }
            else if (sourceType == AzureSpringAppsDeploymentProvider_1.SourceType.BUILD_RESULT) {
                sourcePart = {
                    buildResultId: idOrPath,
                    type: AzureSpringAppsDeploymentProvider_1.SourceType.BUILD_RESULT
                };
            }
            else {
                sourcePart = {
                    relativePath: idOrPath,
                    type: sourceType,
                };
            }
            if (params.version) {
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
                deploymentSettingsPart["addonConfigs"] = {
                    applicationConfigurationService: {
                        configFilePatterns: params.configFilePatterns
                    }
                };
            }
            let transformedEnvironmentVariables = {};
            if (params.environmentVariables) {
                core.debug("Environment variables modified.");
                const parsedEnvVariables = (0, parameterParserUtility_1.parse)(params.environmentVariables);
                //Parsed pairs come back as  {"key1":{"value":"val1"},"key2":{"value":"val2"}}
                Object.keys(parsedEnvVariables).forEach(key => {
                    transformedEnvironmentVariables[key] = parsedEnvVariables[key]['value'];
                });
                core.debug('Environment Variables: ' + JSON.stringify(transformedEnvironmentVariables));
                deploymentSettingsPart["environmentVariables"] = transformedEnvironmentVariables;
            }
            if (getResponse) {
                let source = Object.assign(Object.assign({}, getResponse.properties.source), sourcePart);
                let deploymentSettings = Object.assign(Object.assign({}, getResponse.properties.deploymentSettings), deploymentSettingsPart);
                deploymentResource = {
                    properties: {
                        source: source,
                        deploymentSettings: deploymentSettings
                    },
                    sku: getResponse.sku
                };
            }
            else {
                deploymentResource = {
                    properties: {
                        source: sourcePart,
                        deploymentSettings: deploymentSettingsPart
                    }
                };
            }
            return deploymentResource;
        });
    }
}
exports.DeploymentHelper = DeploymentHelper;
DeploymentHelper.listDeploymentsResult = [];
