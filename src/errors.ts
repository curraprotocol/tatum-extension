export enum CurraWebhookValidatorErrorCode {
	ToAddress,
	FromAddress,
	Value,
	ValueUnits,
}

export class CurraWebhookValidatorError extends Error {
	constructor(
		reason: string,
		public readonly code: CurraWebhookValidatorErrorCode
	) {
		super(reason);
	}
}
