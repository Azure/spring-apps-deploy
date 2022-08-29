# ms-rest-azure-js [![Build Status](https://dev.azure.com/azure-public/azsdk/_apis/build/status/public.Azure.ms-rest-azure-js%20-%20CI?branchName=master)](https://dev.azure.com/azure-public/azsdk/_build/latest?definitionId=31&branchName=master)
Azure Runtime with support for long running operations used by packages generated via the code generator [@microsoft.azure/autorest.typescript](https://www.npmjs.com/package/@microsoft.azure/autorest.typescript).

Use this package if you are writing a library for one of the Azure services whose API requires support for long running operations.
To write a library for one of the Azure services whose API does not need support for long running operations, [@azure/ms-rest-js](https://www.npmjs.com/package/@azure/ms-rest-js) should suffice.

If you are not a library writer for any of the Azure services, you should not need to use this package except for one scenario which is authenticating to any of the Cognitive Services using the below packages. This is when you would use the [CognitiveServicesCredentials](https://github.com/Azure/ms-rest-azure-js/blob/71b0b77ab7c3b9ecb731baab61d207eaa8bb2e97/lib/credentials/cognitiveServicesCredentials.ts#L12) exported from this package.

- [@azure/cognitiveservices-computervision](https://www.npmjs.com/package/@azure/cognitiveservices-computervision)
- [@azure/cognitiveservices-luis-authoring](https://www.npmjs.com/package/@azure/cognitiveservices-luis-authoring)
- [@azure/cognitiveservices-luis-runtime](https://www.npmjs.com/package/@azure/cognitiveservices-luis-runtime)
- [@azure/cognitiveservices-qnamaker](https://www.npmjs.com/package/@azure/cognitiveservices-qnamaker)
- [@azure/cognitiveservices-qnamaker-runtime](https://www.npmjs.com/package/@azure/cognitiveservices-qnamaker-runtime)
- [@azure/cognitiveservices-imagesearch](https://www.npmjs.com/package/@azure/cognitiveservices-imagesearch)
- [@azure/cognitiveservices-contentmoderator](https://www.npmjs.com/package/@azure/cognitiveservices-contentmoderator)
- [@azure/cognitiveservices-anomalydetector](https://www.npmjs.com/package/@azure/cognitiveservices-anomalydetector)
- [@azure/cognitiveservices-face](https://www.npmjs.com/package/@azure/cognitiveservices-face)
- [@azure/cognitiveservices-websearch](https://www.npmjs.com/package/@azure/cognitiveservices-websearch)
- [@azure/cognitiveservices-spellcheck](https://www.npmjs.com/package/@azure/cognitiveservices-spellcheck)
- [@azure/cognitiveservices-customvision-prediction](https://www.npmjs.com/package/@azure/cognitiveservices-customvision-prediction)
- [@azure/cognitiveservices-customvision-training](https://www.npmjs.com/package/@azure/cognitiveservices-customvision-training)
- [@azure/cognitiveservices-customsearch](https://www.npmjs.com/package/@azure/cognitiveservices-customsearch)
- [@azure/cognitiveservices-localsearch](https://www.npmjs.com/package/@azure/cognitiveservices-localsearch)
- [@azure/cognitiveservices-personalizer](https://www.npmjs.com/package/@azure/cognitiveservices-personalizer)
- [@azure/cognitiveservices-newssearch](https://www.npmjs.com/package/@azure/cognitiveservices-newssearch)
- [@azure/cognitiveservices-visualsearch](https://www.npmjs.com/package/@azure/cognitiveservices-visualsearch)
- [@azure/cognitiveservices-videosearch](https://www.npmjs.com/package/@azure/cognitiveservices-videosearch)
- [@azure/cognitiveservices-formrecognizer](https://www.npmjs.com/package/@azure/cognitiveservices-formrecognizer)
- [@azure/cognitiveservices-autosuggest](https://www.npmjs.com/package/@azure/cognitiveservices-autosuggest)
- [@azure/cognitiveservices-entitysearch](https://www.npmjs.com/package/@azure/cognitiveservices-entitysearch)
- [@azure/cognitiveservices-customimagesearch](https://www.npmjs.com/package/@azure/cognitiveservices-customimagesearch)
- [@azure/cognitiveservices-translatortext](https://www.npmjs.com/package/@azure/cognitiveservices-translatortext)
- [@azure/cognitiveservices-textanalytics](https://www.npmjs.com/package/@azure/cognitiveservices-textanalytics)

## Requirements
- node.js version > 6.x
- npm install -g typescript

## Installation
- After cloning the repo, execute `npm install`

## Execution

### node.js
- Set the subscriptionId and token
- Run `node samples/node-sample.js`

### In the browser
- Set the subscriptionId and token and then run
- Open index.html file in the browser. It should show the response from GET request on the storage account. From Chrome type Ctrl + Shift + I and you can see the logs in console.

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
