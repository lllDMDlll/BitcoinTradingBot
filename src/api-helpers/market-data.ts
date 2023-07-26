import { RESTClient } from "cw-sdk-node";

export type OHLCOptions = {
    before: string | undefined;
    after: string | undefined;
    periods: string;
}

class MarketData {
    private client;

    /**
     * Class for performing calls to obtain market data
     * @param apiKey - cryptowatch api key
     */
    constructor(apiKey: string) {
        this.client = new RESTClient({
            creds: {
                apiKey: apiKey
            }
        })
    }

    /**
     *
     * @param exchange - name of the exchange to get the data from
     * @param pair - trading pair (Example: 'btcusd')
     * @param options - OHLC options including before, after, and periods
     * @returns {Promise}
     */
    async getOHLC(exchange: string, pair: string, options: OHLCOptions) {
        return this.client.getOHLC(exchange, pair, options).then((result) => {
            return result
        })
    }
}

export { MarketData }