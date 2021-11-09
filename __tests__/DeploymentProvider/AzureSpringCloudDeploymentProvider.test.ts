
import {ActionParameters, ActionParametersUtility} from "../../src/operations/ActionParameters";
import {DeploymentHelper} from "../../src/DeploymentProvider/DeploymentHelper";
import {AzureSpringCloudDeploymentProvider} from "../../src/DeploymentProvider/AzureSpringCloudDeploymentProvider";

jest.mock('@azure/identity');
jest.mock('@actions/core');
jest.mock('@azure/arm-appplatform')
jest.mock('../../src/DeploymentProvider/DeploymentHelper')

describe('Test azure-spring-cloud-deployment-provider', () => {

    afterEach(() => {
        jest.restoreAllMocks();
    })

    test("set active deployment", async () => {
        const params: ActionParameters = {
            azureSubscription: 'AzureSubscription',
            serviceName: 'ServiceName',
            action: 'set production',
            appName: 'AppName',
            useStagingDeployment: true
        }
        const actionParamsSpy = jest.spyOn(ActionParametersUtility, 'getParameters').mockReturnValue(params);
        const stagingSpy = jest.spyOn(DeploymentHelper, 'getStagingDeploymentName').mockImplementation(async () => 'staging');
        let provider: AzureSpringCloudDeploymentProvider = new AzureSpringCloudDeploymentProvider();
        await provider.deployAppStep();
        expect(DeploymentHelper.setActiveDeployment).toBeCalledTimes(1);
        expect(DeploymentHelper.getStagingDeploymentName).toBeCalledTimes(1);
    });

    test("delete staging deployment", async () => {
        const params: ActionParameters = {
            azureSubscription: 'AzureSubscription',
            serviceName: 'ServiceName',
            action: 'delete staging deployment',
            appName: 'AppName'
        }
        const actionParamsSpy = jest.spyOn(ActionParametersUtility, 'getParameters').mockReturnValue(params);
        const stagingSpy = jest.spyOn(DeploymentHelper, 'getStagingDeploymentName').mockImplementation( async () => 'staging');
        let provider: AzureSpringCloudDeploymentProvider = new AzureSpringCloudDeploymentProvider();
        await provider.deployAppStep();
        expect(DeploymentHelper.deleteDeployment).toBeCalledTimes(1);
        expect(DeploymentHelper.getStagingDeploymentName).toBeCalledTimes(1);
    });

});
