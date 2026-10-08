declare module "@site-garage-saved-cars" {
  export const GARAGE_STORAGE_KEY: string;
  export const GARAGE_TRANSFER_KEY: string;
  export const GARAGE_CARS_CHANGED_EVENT: string;
  export const GARAGE_BROADCAST_CHANNEL: string;
  export function readSavedCars(): unknown[];
  export function writeSavedCars(cars: unknown[]): void;
  export function emitGarageCarsRevalidate(): void;
  export function subscribeGarageCars(onStoreChange: () => void): () => void;
  export function onGarageCarsUpdated(callback: () => void): () => void;
  export function stashGarageForTransfer(): void;
}
