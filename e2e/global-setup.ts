import { startMetaMockServer } from "./fixtures/meta-mock-server";

export default async function globalSetup() {
  await startMetaMockServer();
}
