import { Curra, WebhookIncomePayloadDto } from "@curra/sdk";
import {
	EvmBasedBeaconRpcSuite,
	ITatumSdkContainer,
	Network,
	TatumSdkExtension,
} from "@tatumio/tatum";
import { Token } from "@tatumio/tatum/dist/src/service/token";
import Decimal from "decimal.js-light";
import { formatUnits, fromHex, getAddress, getEventSelector, pad } from "viem";

import {
	CurraWebhookValidatorError,
	CurraWebhookValidatorErrorCode,
} from "./errors";

export interface CurraWebhookValidatorOptions {
	curra: Curra;
}

interface ValidatableTransfer {
	to: string;
	from: string;
	value: string;
	valueUnits: bigint;
}

export class CurraWebhookValidator extends TatumSdkExtension {
	private readonly rpc: EvmBasedBeaconRpcSuite;
	private readonly token: Token;

	constructor(
		tatumSdkContainer: ITatumSdkContainer,
		private readonly options: CurraWebhookValidatorOptions,
	) {
		super(tatumSdkContainer);
		this.rpc = tatumSdkContainer.getRpc();
		this.token = tatumSdkContainer.get(Token);
	}

	supportedNetworks: Network[] = [
		Network.BINANCE_SMART_CHAIN,
		Network.POLYGON,
		Network.ETHEREUM,
		Network.ETHEREUM_GOERLI,
	];

	// validate webhook body against the blockchain or throw
	public async validateBodyOrAbort(
		body: WebhookIncomePayloadDto,
	): Promise<void> {
		const error = await this.validateBody(body);
		if (!error) return;
		throw error;
	}

	// validate webhook body against the blockchain
	public async validateBody(
		body: WebhookIncomePayloadDto,
	): Promise<CurraWebhookValidatorError | undefined> {
		const curra = this.options.curra;

		const asset = await curra.getAssetById({
			id: body.assetId,
			blockchain: body.blockchain,
		});

		const transfers: Array<{
			from: string;
			to: string;
			valueUnits: bigint;
			value: string;
		}> = [];

		if (!asset.address) {
			const coinTransfers = await this.getValidatableCoinTransfers(body);
			transfers.push(...coinTransfers);
		} else {
			const erc20Transfers = await this.getValidatableERC20Transfers(
				body,
				asset.address,
			);
			transfers.push(...erc20Transfers);
		}

		let error: CurraWebhookValidatorError | undefined;

		for (const transfer of transfers) {
			if (getAddress(transfer.from) !== getAddress(body.fromAddresses[0])) {
				error = new CurraWebhookValidatorError(
					`Transfer from ${transfer.from} instead of ${body.fromAddresses[0]}`,
					CurraWebhookValidatorErrorCode.FromAddress,
				);
				continue;
			}

			if (getAddress(transfer.to) !== getAddress(body.toAddress.value)) {
				error = new CurraWebhookValidatorError(
					`Transfer to ${transfer.to} instead of ${body.toAddress.value}`,
					CurraWebhookValidatorErrorCode.ToAddress,
				);
				continue;
			}

			if (transfer.valueUnits !== BigInt(body.valueUnits)) {
				error = new CurraWebhookValidatorError(
					`Transfer valueUnits ${transfer.valueUnits} instead of ${body.valueUnits}`,
					CurraWebhookValidatorErrorCode.ValueUnits,
				);
				continue;
			}

			if (!new Decimal(transfer.value).equals(body.value)) {
				error = new CurraWebhookValidatorError(
					`Transfer value ${transfer.value} instead of ${body.value}`,
					CurraWebhookValidatorErrorCode.Value,
				);
				continue;
			}

			error = undefined;
			break;
		}

		return error;
	}

	// fetch all ERC20 transfers that can relate to the webhook
	private async getValidatableERC20Transfers(
		body: WebhookIncomePayloadDto,
		assetAddress: string,
	): Promise<ValidatableTransfer[]> {
		const tokenMetadata = await this.token.getTokenMetadata({
			tokenAddress: assetAddress,
		});
		const transferEventTopic = getEventSelector(
			"Transfer(address,address,uint256)",
		);
		const fromTopic = pad(body.fromAddresses[0] as `0x${string}`);
		const toTopic = pad(body.toAddress.value as `0x${string}`);

		const logsResponse = await this.rpc.getLogs({
			fromBlock: body.block.toString(),
			toBlock: body.block.toString(),
			topics: [transferEventTopic, fromTopic, toTopic],
			address: assetAddress,
		});
		const logs = logsResponse.result ?? [];

		const transfers: ValidatableTransfer[] = [];

		for (const log of logs) {
			const from = `0x${log.topics[1].slice(-40)}`;
			const to = `0x${log.topics[2].slice(-40)}`;
			const valueUnits = fromHex(log.data, "bigint");

			transfers.push({
				from,
				to,
				valueUnits,
				value: formatUnits(valueUnits, tokenMetadata.data.decimals),
			});
		}

		return transfers;
	}

	// geth traces are nested, this flattens them to simplify processing
	// rome-ignore lint: tech debt :)
	private flattenTraces(trace: any): any[] {
		const result = [trace];
		if (trace.calls) {
			for (const call of trace.calls) {
				result.push(...this.flattenTraces(call));
			}
		}
		return result;
	}

	// fetch all coin transfers that can relate to the webhook
	private async getValidatableCoinTransfers(
		body: WebhookIncomePayloadDto,
	): Promise<ValidatableTransfer[]> {
		const tracesResponse = await this.rpc.debugTraceTransaction(body.txHash, {
			tracer: "callTracer",
			tracerConfig: {
				onlyTopCall: false,
				timeout: "20000",
			},
		});
		const traces = this.flattenTraces(tracesResponse.result);
	  // rome-ignore lint: tech debt :)
		return traces.map((trace: any) => {
			const valueUnits = fromHex(trace.value, "bigint");
			return {
				from: trace.from,
				to: trace.to,
				value: formatUnits(valueUnits, 18),
				valueUnits,
			};
		});
	}
}
