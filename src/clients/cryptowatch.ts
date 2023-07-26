import { MarketData } from '../api-helpers/market-data'

const CW_API_KEY = "<api-key>";
const cw = new MarketData(CW_API_KEY);

export { cw }
