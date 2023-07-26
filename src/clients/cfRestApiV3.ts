import crypto from 'crypto';
import utf8 from 'utf8';
import axios from 'axios';

class CfRestApiV3 {
    private baseUrl: string;
    private apiKey: string;
    private apiSecret: string;
    private timeout: number;

    constructor(baseUrl: string, apiKey: string, apiSecret: string, timeout: number) {
        this.baseUrl = baseUrl
        this.apiKey = apiKey
        this.apiSecret = apiSecret
        this.timeout = timeout
    }

    // ######################
    // ## public endpoints ##
    // ######################

    /**
     * Returns market data for all instruments.
     */
    getTickers() {
        return axios.get(
            this.baseUrl + '/derivatives/api/v3/tickers',
            {
                headers: { Accept: 'application/json' },
                timeout: this.timeout
            }
        );
    }

    // #######################
    // ## private endpoints ##
    // #######################

    /**
     * Returns key account information.
     */
    getAccounts() {
        const endpoint = '/derivatives/api/v3/accounts'
        const nonce = createNonce()
        const authent = this.signRequest(endpoint, nonce)
        const headers = {
            Accept: 'application/json',
            APIKey: this.apiKey,
            Nonce: nonce,
            Authent: authent,
        }

        return axios.get(
            this.baseUrl + endpoint,
            {
                headers: headers,
                timeout: this.timeout
            }
        );
    }

    /**
     * Send/place order.
     */
    sendOrder(
        orderType: string,
        symbol: string,
        side: string,
        size: number,
        limitPrice: number,
        stopPrice?: number,
        triggerSignal?: string,
        clientOrderId?: string
    ) {
        const endpoint = '/derivatives/api/v3/sendorder'
        const nonce = createNonce()
        let data = `orderType=${orderType}&symbol=${symbol}&side=${side}&size=${parseFloat(size.toFixed(4))}&limitPrice=${Math.round(limitPrice)}`
        if (stopPrice) data = `${data}&stopPrice=${Math.round(stopPrice)}`
        if (triggerSignal) data = `${data}&triggerSignal=${triggerSignal}`
        if (clientOrderId) data = `${data}&cliOrdId=${clientOrderId}`
        const authent = this.signRequest(endpoint, nonce, data)
        const headers = {
            Accept: 'application/json',
            APIKey: this.apiKey,
            Nonce: nonce,
            Authent: authent,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length,
        }
        return axios.post(
            this.baseUrl + endpoint,
            data,
            {
                headers: headers,
                timeout: this.timeout
            }
        );
    }

    /**
     * Cancels an open order.
     */
    cancelOrder(orderId: string, cliOrdId?: string) {
        const endpoint = '/derivatives/api/v3/cancelorder'
        const data = orderId ? `order_id=${orderId}` : `cliOrdId=${cliOrdId}`
        const nonce = createNonce()
        const authent = this.signRequest(endpoint, nonce, data)
        const headers = {
            Accept: 'application/json',
            APIKey: this.apiKey,
            Nonce: nonce,
            Authent: authent,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length,
        }
        return axios.post(
            this.baseUrl + endpoint,
            data,
            {
                headers: headers,
                timeout: this.timeout
            }
        );
    }

    /**
     * Returns all open orders.
     */
    getOpenOrders() {
        const endpoint = '/derivatives/api/v3/openorders'
        const nonce = createNonce()
        const authent = this.signRequest(endpoint, nonce)
        const headers = {
            Accept: 'application/json',
            APIKey: this.apiKey,
            Nonce: nonce,
            Authent: authent,
        }
        return axios.get(
            this.baseUrl + endpoint,
            {
                headers: headers,
                timeout: this.timeout
            }
        );
    }

    /**
     * Returns all open positions.
     */
    getOpenPositions() {
        const endpoint = '/derivatives/api/v3/openpositions'
        const nonce = createNonce()
        const authent = this.signRequest(endpoint, nonce)
        const headers = {
            Accept: 'application/json',
            APIKey: this.apiKey,
            Nonce: nonce,
            Authent: authent,
        }
        return axios.get(
            this.baseUrl + endpoint,
            {
                headers: headers,
                timeout: this.timeout
            }
        )
    }

    getPastFills(lastFillTime = null) {
        const endpoint = '/derivatives/api/v3/fills'
        const data = lastFillTime ? `lastFillTime=${lastFillTime}` : ''
        const nonce = createNonce()
        const authent = this.signRequest(endpoint, nonce)
        const headers = {
            Accept: 'application/json',
            APIKey: this.apiKey,
            Nonce: nonce,
            Authent: authent,
        }
        return axios.get(
            `${this.baseUrl}${endpoint}?${encodeURI(data)}`,
            {
                headers: headers,
                timeout: this.timeout
            }
        )
    }

    /**
     * Sign request.
     */
    signRequest(endpoint: string, nonce = '', postData = '') {
        // step 1: concatenate postData, nonce + endpoint
        if (endpoint.startsWith('/derivatives')) {
            endpoint = endpoint.slice('/derivatives'.length)
        }

        const message = postData + nonce + endpoint

        // Step 2: hash the result of step 1 with SHA256
        const hash = crypto.createHash('sha256').update(utf8.encode(message)).digest()

        // step 3: base64 decode apiPrivateKey
        const secretDecoded = Buffer.from(this.apiSecret, 'base64')

        // step 4: use result of step 3 to hash the result of step 2 with
        const hash2 = crypto.createHmac('sha512', secretDecoded).update(hash).digest()

        // step 5: base64 encode the result of step 4 and return
        return Buffer.from(hash2).toString('base64')
    }
}

// Generate nonce
let nonce = 0
function createNonce() {
    if (nonce === 9999) nonce = 0
    const timestamp = new Date().getTime()
    return timestamp + ('0000' + nonce++).slice(-5)
}

export {
    CfRestApiV3,
}