export class InvalidNotificationError extends Error {
  constructor(
    message: string,
    readonly code = "INVALID_NOTIFICATION",
  ) {
    super(message);
    this.name = "InvalidNotificationError";
  }
}

export class NotificationProviderError extends Error {
  constructor(
    message: string,
    readonly code = "PROVIDER_FAILURE",
  ) {
    super(message);
    this.name = "NotificationProviderError";
  }
}
