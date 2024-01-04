import { Blockchain, Curra, EvmIncomeStatus, IncomeStatus } from "@curra/sdk";
import { BaseEvm, Network, TatumSDK } from "@tatumio/tatum";
import { afterAll, beforeAll, test } from "vitest";

import { CurraWebhookValidator } from "./extension";

const testData = {
	network: Network.BINANCE_SMART_CHAIN,
	webhooks: {
		erc20: {
			id: "6576951bdcba373ad7ff4f45",
			block: 34251681,
			toAddress: { value: "0xF55bE4Cd98aAa5D300BF0CAF98A6A9Cc6Dd3829D" },
			fromAddresses: ["0xf89d7b9c864f589bbF53a82105107622B35EaA40"],
			confirmations: 21,
			txHash:
				"0x7bdad2b3a95f72c7d99e8894f43452b624d5e19dc97443ea2aade20eb5c3ba42",
			status: IncomeStatus.Success,
			subStatus: EvmIncomeStatus.Forwarded,
			statusDescription: "Forwarded",
			blockchain: Blockchain.SMART_CHAIN,
			assetId: "650b0647d74a9e9d0b6b4f55",
			value: "500.0",
			valueUnits: "500000000000000000000",
			createdAt: "2023-12-11T04:50:35.687Z",
		},
		coin: {
			id: "6575f454dcba373ad7ff4ce5",
			block: 34237477,
			toAddress: { value: "0x4aE8EB35ecBE7F518981dFEA469BC86F3539ef74" },
			fromAddresses: ["0xf89d7b9c864f589bbF53a82105107622B35EaA40"],
			confirmations: 21,
			txHash:
				"0x64b8ccdf68448ca8167b78fbc75bf708618fa3a1c8ecea4dbad4afb707979e07",
			status: IncomeStatus.Success,
			subStatus: EvmIncomeStatus.Forwarded,
			statusDescription: "Forwarded",
			blockchain: Blockchain.SMART_CHAIN,
			assetId: "650b0646d74a9e9d0b6b4f2b",
			value: "3.46888962",
			valueUnits: "3468889620000000000",
			createdAt: "2023-12-10T17:24:36.723Z",
		},
	},
};

let tatumSdk: BaseEvm;

const apiKey = process.env.CURRA_API_KEY;
if (!apiKey) throw new Error("CURRA_API_KEY env variable is not set.");

const curra = Curra.fromApiKey({ apiKey });

beforeAll(async () => {
	tatumSdk = await TatumSDK.init({
		network: testData.network,
		configureExtensions: [
			{
				type: CurraWebhookValidator,
				config: { curra },
			},
		],
	});
});

afterAll(async () => {
	await tatumSdk.destroy();
});

test(
	"erc20: should not abort",
	async () => {
		await tatumSdk
			.extension(CurraWebhookValidator)
			.validateBodyOrAbort(testData.webhooks.erc20);
	},
	{ timeout: 60000 },
);

test(
	"coins: should not abort",
	async () => {
		await tatumSdk
			.extension(CurraWebhookValidator)
			.validateBodyOrAbort(testData.webhooks.coin);
	},
	{ timeout: 60000 },
);
