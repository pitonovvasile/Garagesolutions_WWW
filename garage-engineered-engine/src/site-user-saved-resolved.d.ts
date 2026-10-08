declare module "@site-user-saved-resolved" {
  export const USER_SAVED_VEHICLES_RESOLVED: "user_saved_vehicles_resolved";
  export function rowToSavedCarFromResolved(row: Record<string, unknown>): Record<string, unknown>;
}
