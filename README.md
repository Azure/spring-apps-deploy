# GitHub Action for deploying to Azure Spring Cloud

GitHub Actions support an automated software development lifecycle workflow. With GitHub Actions for Azure Spring Cloud you can create workflows in your repository to manage your deployment of Azure Spring Cloud conveniently.

## Prerequisites
### Set up GitHub repository and authenticate

You need an [Azure service principal credential](https://docs.microsoft.com/en-us/cli/azure/create-an-azure-service-principal-azure-cli) to authorize Azure login action. To get an Azure credential, execute the following commands on your local machine:
```azurecli
az login
az ad sp create-for-rbac --role contributor --scopes /subscriptions/<SUBSCRIPTION_ID> --sdk-auth
```

To access to a specific resource group, you can reduce the scope:

```azurecli
az ad sp create-for-rbac --role contributor --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP> --sdk-auth
```
The command should output a JSON object:

```json
{
  "clientId": "<GUID>",
  "clientSecret": "<GUID>",
  "subscriptionId": "<GUID>",
  "tenantId": "<GUID>",
  ...
}
```

### Dependencies on other GitHub Actions

* [Checkout](https://github.com/actions/checkout) Checkout your Git repository content into GitHub Actions agent.
* Authenticate using the [Azure Login Action](https://github.com/Azure/login) with the Azure service principal credential prepared as mentioned above. Examples are given later in this article.

## End-to-End Sample Workflows
### Deploying
#### To production
Azure Spring Cloud supports deploying to deployments with built artifacts (e.g., JAR or .NET Core ZIP) or source code archive.
The following example deploys to the default production deployment in Azure Spring Cloud using JAR file built by Maven. This is the only possible deployment scenario when using the Basic SKU:

```yml
name: AzureSpringCloud
on: push
env:
  ASC_PACKAGE_PATH: ${{ github.workspace }}
  AZURE_SUBSCRIPTION: <azure subscription id>

jobs:
  deploy_to_production:
    runs-on: ubuntu-latest
    name: deploy to production with artifact
    steps:
      - name: Checkout Github Action
        uses: actions/checkout@v2
        
      - name: Set up JDK 1.8
        uses: actions/setup-java@v1
        with:
          java-version: 1.8

      - name: maven build, clean
        run: |
          mvn clean package

      - name: Login via Azure CLI
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: deploy to production with artifact
        uses: azure/spring-cloud-deploy@v1
        with:
          azure-subscription: ${{ env.AZURE_SUBSCRIPTION }}
          action: Deploy
          service-name: <service instance name>
          app-name: <app name>
          use-staging-deployment: false
          package: ${{ env.ASC_PACKAGE_PATH }}/**/*.jar
```

The following example deploys to the default production deployment in Azure Spring Cloud using source code.

```yml
name: AzureSpringCloud
on: push
env:
  ASC_PACKAGE_PATH: ${{ github.workspace }}
  AZURE_SUBSCRIPTION: <azure subscription id>

jobs:
  deploy_to_production:
    runs-on: ubuntu-latest
    name: deploy to production with soruce code
    steps:
      - name: Checkout Github Action
        uses: actions/checkout@v2

      - name: Login via Azure CLI
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: deploy to production step with soruce code
        uses: azure/spring-cloud-deploy@v1
        with:
          azure-subscription: ${{ env.AZURE_SUBSCRIPTION }}
          action: deploy
          service-name: <service instance name>
          app-name: <app name>
          use-staging-deployment: false
          package: ${{ env.ASC_PACKAGE_PATH }}
```

#### Blue-green

The following examples deploy to an existing staging deployment. This deployment will not receive production traffic until it is set as a production deployment. You can set use-staging-deployment true to find the staging deployment automatically or just allocate specific deployment-name. We will only focus on the spring-cloud-deploy action and leave out the preparatory jobs in the rest of the article.

```yml
# environment preparation configurations omitted
    steps:
      - name: blue green deploy step use-staging-deployment
        uses: azure/spring-cloud-deploy@v1
        with:
          azure-subscription: ${{ env.AZURE_SUBSCRIPTION }}
          action: deploy
          service-name: <service instance name>
          app-name: <app name>
          use-staging-deployment: true
          package: ${{ env.ASC_PACKAGE_PATH }}/**/*.jar
```

```yml
# environment preparation configurations omitted
    steps:
      - name: blue green deploy step with deployment-name
        uses: azure/spring-cloud-deploy@v1
        with:
          azure-subscription: ${{ env.AZURE_SUBSCRIPTION }}
          action: deploy
          service-name: <service instance name>
          app-name: <app name>
          deployment-name: staging
          package: ${{ env.ASC_PACKAGE_PATH }}/**/*.jar
```

For more information on blue-green deployments, including an alternative approach, see [Blue-green deployment strategies](https://docs.microsoft.com/en-us/azure/spring-cloud/concepts-blue-green-deployment-strategies).

### Setting production deployment

The following example will set the current staging deployment as production, effectively swapping which deployment will receive production traffic.

```yml
# environment preparation configurations omitted
    steps:
      - name: set production deployment step
        uses: azure/spring-cloud-deploy@v1
        with:
          azure-subscription: ${{ env.AZURE_SUBSCRIPTION }}
          action: set-production
          service-name: <service instance name>
          app-name: <app name>
          use-staging-deployment: true
```
### Deleting a staging deployment

The "Delete Staging Deployment" action allows you to delete the deployment not receiving production traffic. This frees up resources used by that deployment and makes room for a new staging deployment:

```yml
# environment preparation configurations omitted
    steps:
      - name: Delete staging deployment step
        uses: azure/spring-cloud-deploy@v1
        with:
          azure-subscription: ${{ env.AZURE_SUBSCRIPTION }}
          action: delete-staging-deployment
          service-name: <service instance name>
          app-name: <app name>
```

## Arguments
> [!NOTE]
> Some arguments are only applicable for certain settings of the `action` argument. The Action column below specifies the pertinent actions for each argument. Any argument listed as Required is only required for the pertinent Action(s).

|Argument|<div style="width:100px">Action</div>|Required|Description|
|--- |--- |--- |--- |
|`action`|all|Required| The action to be performed by this task.<br/>One of: `deploy`, `set-production`, `delete-staging-deployment`<br/>Default value: `deploy`|
|`azure-subscription`|all|Required| The Azure subscription ID for the target Azure Spring Cloud instance.|
|`service-name`|all|Required| The name of the Azure Spring Cloud service instance.|
|`app-name`|all|Required| The name of the Azure Spring Cloud app to deploy. The app must exist prior to task execution.
|`use-staging-deployment`|deploy<br/>set-production|Optional| If set to `true`, apply the task to whichever deployment is set as the staging deployment at time of execution. If set to `false`, apply the task to the production deployment.<br/>Default value: `true`|
|`deployment-name`|deploy<br/>set-production|Optional| The name of the deployment to which the action will apply. It overrides the setting of `use-staging-deployment`.|
|`create-new-deployment`|deploy|Optional| If set to `true` and the deployment specified by `deployment-name` does not exist at execution time, it will be created.<br/>Default value: `false`|
|`package`|deploy|Required| The file path to the package containing the application to be deployed (`.jar` file for Java, `.zip` for .NET Core) or to a folder containing the application source to be built. <br/>Default value: ```${{ github.workspace }}/**/*.jar```|
|`runtime-version`|deploy|Optional| The runtime stack for the application.<br/>One of: `Java_8`, `Java_11`, `NetCore_31`,<br/>Default value: `Java_11`|
|`environment-variables`|deploy|Optional| Environment variables to be entered using the syntax &#39;-key value&#39;. Values containing spaces should be enclosed in double quotes. <br/>Example: ```-CUSTOMER_NAME Contoso -WEBSITE_TIME_ZONE "Eastern Standard Time"```|
|`jvm-options`|deploy|Optional| A string containing JVM Options. <br/> Example: `-Dspring.profiles.active=mysql`|
|`dotnetcore-mainentry-path`|deploy|Optional| A string containing the path to the .NET executable relative to zip root.|
|`version`|deploy|Optional| The deployment version. If not set, the version is left unchanged.|

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
