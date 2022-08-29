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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentHelper = void 0;
const azure_storage_1 = require("./azure-storage");
const core = __importStar(require("@actions/core"));
const parameterParserUtility_1 = require("azure-actions-utility/parameterParserUtility");
class DeploymentHelper {
    static listDeployments(client, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.listDeploymentsResult != null) {
                core.debug('list from cache, list deployments response: ' + this.listDeploymentsResult._response.bodyAsText);
                return this.listDeploymentsResult;
            }
            const deployments = yield client.deployments.list(params.resourceGroupName, params.serviceName, params.appName);
            core.debug('list deployments response: ' + deployments._response.bodyAsText);
            if (!this.GET_SUCCESS_CODE.includes(deployments._response.status)) {
                throw Error('ListDeploymentsError');
            }
            this.listDeploymentsResult = deployments;
            return deployments;
        });
    }
    static getDeployment(client, params, deploymentName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.listDeploymentsResult != null) {
                core.debug('get from list cache, list deployments response: ' + this.listDeploymentsResult._response.bodyAsText);
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
            core.debug('get deployments response: ' + getResponse._response.bodyAsText);
            if (!this.GET_SUCCESS_CODE.includes(getResponse._response.status)) {
                throw Error('GetDeploymentsError');
            }
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
            let appResource = {
                properties: {
                    activeDeploymentName: params.deploymentName
                }
            };
            const updateResponse = yield client.apps.update(params.resourceGroupName, params.serviceName, params.appName, appResource);
            core.debug('set active deployment response: ' + updateResponse._response.bodyAsText);
            if (!this.CREATE_OR_UPDATE_SUCCESS_CODE.includes(updateResponse._response.status)) {
                throw Error('SetActiveDeploymentError');
            }
            return;
        });
    }
    static deploy(client, params, sourceType, fileToUpload) {
        return __awaiter(this, void 0, void 0, function* () {
            let uploadResponse = yield client.apps.getResourceUploadUrl(params.resourceGroupName, params.serviceName, params.appName);
            core.debug('request upload url response: ' + uploadResponse._response.bodyAsText);
            if (!this.GET_SUCCESS_CODE.includes(uploadResponse._response.status)) {
                throw Error('RequestUploadUrlError');
            }
            yield (0, azure_storage_1.uploadFileToSasUrl)(uploadResponse.uploadUrl, fileToUpload);
            let getDeploymentName = params.deploymentName;
            if (params.createNewDeployment) {
                getDeploymentName = yield this.getProductionDeploymentName(client, params);
            }
            let getResponse = yield this.getDeployment(client, params, getDeploymentName);
            let deploymentResource;
            let sourcePart = {
                relativePath: uploadResponse.relativePath,
                type: sourceType
            };
            if (params.version) {
                sourcePart.version = params.version;
            }
            let deploymentSettingsPart = {};
            if (params.jvmOptions) {
                deploymentSettingsPart.jvmOptions = params.jvmOptions;
            }
            if (params.dotNetCoreMainEntryPath) {
                deploymentSettingsPart.netCoreMainEntryPath = params.dotNetCoreMainEntryPath;
            }
            if (params.runtimeVersion) {
                deploymentSettingsPart.runtimeVersion = params.runtimeVersion;
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
                deploymentSettingsPart.environmentVariables = transformedEnvironmentVariables;
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
            core.debug("deploymentResource: " + JSON.stringify(deploymentResource));
            const response = yield client.deployments.createOrUpdate(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName, deploymentResource);
            core.debug('deploy response: ' + response._response.bodyAsText);
            if (!this.CREATE_OR_UPDATE_SUCCESS_CODE.includes(response._response.status)) {
                throw Error('DeployError');
            }
            return;
        });
    }
    static deleteDeployment(client, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield client.deployments.deleteMethod(params.resourceGroupName, params.serviceName, params.appName, params.deploymentName);
            core.debug('delete deployment response: ' + response._response.bodyAsText);
            if (!this.DELETE_SUCCESS_CODE.includes(response._response.status)) {
                throw Error('DeleteDeploymentError');
            }
            return;
        });
    }
}
exports.DeploymentHelper = DeploymentHelper;
DeploymentHelper.CREATE_OR_UPDATE_SUCCESS_CODE = [200];
DeploymentHelper.DELETE_SUCCESS_CODE = [200, 204];
DeploymentHelper.GET_SUCCESS_CODE = [200];
DeploymentHelper.listDeploymentsResult = null;
