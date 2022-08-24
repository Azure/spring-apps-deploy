import * as core from '@actions/core';
import {AzureSpringAppsDeploymentProvider} from "./DeploymentProvider/AzureSpringAppsDeploymentProvider";

export async function main() {

  try {
    core.debug('Starting deployment task execution');
    let deploymentProvider = new AzureSpringAppsDeploymentProvider();
    core.debug("Pre-deployment Step Started");
    await deploymentProvider.preDeploymentStep();
    core.debug("Deployment Step Started");
    await deploymentProvider.deployAppStep();
  }
  catch (error) {
      core.setFailed("Action failed with error: " + error.message);
  }
}

main();

