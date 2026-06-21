export const APP_NAME = "ICPC Trainer";
export const APP_SERVICE_ID = "icpc-trainer";

export interface HealthStatus {
  readonly ok: true;
  readonly service: typeof APP_SERVICE_ID;
  readonly database: "ok";
  readonly timestamp: string;
}
