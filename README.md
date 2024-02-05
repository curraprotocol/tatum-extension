# Curra Tatum Extension

The purpose of the extension is to enable Curra users to validate webhooks received from Curra against the blockchain, eliminating the need to solely trust Curra's data.

# Prerequisites

Depending on the volume of your validations, a [Tatum](https://tatum.io) API Key may be necessary since the free API calls might be insufficient. It is recommended to create a [Tatum](https://tatum.io) account [here](https://dashboard.tatum.io/signup) and purchase a non-free plan.

# How to use

```typescript
import { Curra } from "@curra/sdk";
import { CurraWebhookValidator } from "@curra/tatum-extension";
import { Network, TatumSDK } from "@tatumio/tatum";

// initialize Curra SDK
const apiKey = "curra-api-key"

const tatumSdk = await TatumSDK.init({
  // specify webhooks network
  network: Network.ETHEREUM,
  configureExtensions: [
    {
      type: CurraWebhookValidator,
      config: { apiKey },
    },
  ],
  apiKey: {
    v4: 'YOUR_API_KEY'
  }
});

// abort on error
await tatumSdk
  .extension(CurraWebhookValidator)
  .validateBodyOrAbort(request.body);

// return error
const error =  tatumSdk
  .extension(CurraWebhookValidator)
  .validateBody(request.body);

// don't forget to destroy the instance
await tatumSdk.destroy();
```

# Contributing
**Warning**:
The repository isn't intended for use in a development environment, as it was extracted from Curra team's private monorepository. 

Nonetheless, contributions are appreciated! You can contribute by creating an issue to propose a new feature or report a bug.




# License
Distributed under the MIT License. See LICENSE for more information.
