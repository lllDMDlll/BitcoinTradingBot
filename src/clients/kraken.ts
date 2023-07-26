import { testFuturesPrivateKey, testFuturesPublicKey } from "../constants/KrakenConstants"
import { CfRestApiV3 as cf } from './cfRestApiV3';

// const baseUrl = "https://futures.kraken.com";
const testBaseUrl = "https://demo-futures.kraken.com";
const defaultTimeout = 5000;

export type AccountResponse = {
    data: {
        accounts: {
            flex: {
                currencies: {
                    USD: {
                        available: number
                    }
                }
            }
        }
    }
}

const krakenFuturesTestClient = new cf(testBaseUrl, testFuturesPublicKey, testFuturesPrivateKey, defaultTimeout)

export { krakenFuturesTestClient }