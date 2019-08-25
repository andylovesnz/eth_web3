"use strict";
import { UrlJsonRpcProvider } from "./url-json-rpc-provider";
import { Logger } from "@ethersproject/logger";
import { version } from "./_version";
const logger = new Logger(version);
// Special API key provided by Nodesmith for ethers.js
const defaultApiKey = "ETHERS_JS_SHARED";
export class NodesmithProvider extends UrlJsonRpcProvider {
    static getApiKey(apiKey) {
        return apiKey || defaultApiKey;
    }
    static getUrl(network, apiKey) {
        let host = null;
        switch (network.name) {
            case "homestead":
                host = "https://ethereum.api.nodesmith.io/v1/mainnet/jsonrpc";
                break;
            case "ropsten":
                host = "https://ethereum.api.nodesmith.io/v1/ropsten/jsonrpc";
                break;
            case "rinkeby":
                host = "https://ethereum.api.nodesmith.io/v1/rinkeby/jsonrpc";
                break;
            case "goerli":
                host = "https://ethereum.api.nodesmith.io/v1/goerli/jsonrpc";
                break;
            case "kovan":
                host = "https://ethereum.api.nodesmith.io/v1/kovan/jsonrpc";
                break;
            default:
                logger.throwArgumentError("unsupported network", "network", arguments[0]);
        }
        return (host + "?apiKey=" + apiKey);
    }
}
