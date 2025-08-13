import { AbstractProvider } from "./abstract/AbstractProvider";
// import { MainProviderImplementation } from "./protocol/provider";
import { GatewayProviderImplementation } from "./protocol/gateway-provider";

export const providers: Record<string, AbstractProvider> = {
  main: new GatewayProviderImplementation(),
};
