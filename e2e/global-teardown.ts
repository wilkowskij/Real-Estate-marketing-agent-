import { stopMetaMockServer } from "./fixtures/meta-mock-server";

export default async function globalTeardown() {
  await stopMetaMockServer();
}
