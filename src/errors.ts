export enum CurraWebhookValidatorErrorCode {
	ToAddress = 0,
	FromAddress = 1,
	Value = 2,
	ValueUnits = 3,
}

export class CurraWebhookValidatorError extends Error {
	constructor(
		reason: string,
		public readonly code: CurraWebhookValidatorErrorCode,
	) {
		super(reason);
	}
}
