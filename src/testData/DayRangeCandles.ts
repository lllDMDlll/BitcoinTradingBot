import { Candle } from "../types/Candle";
const dayCandles = {
    '86400': [
        {
            closeTime: 1675666801,
            openPrice: '1',
            highPrice: '2',
            lowPrice: '0',
            closePrice: '1',
            volume: '10',
            quoteVolume: '100'
        },
        {
            closeTime: 1675666802,
            openPrice: '1',
            highPrice: '2',
            lowPrice: '1',
            closePrice: '2',
            volume: '10',
            quoteVolume: '100'
        },
        {
            closeTime: 1675623601,
            openPrice: '2',
            highPrice: '2',
            lowPrice: '0',
            closePrice: '1',
            volume: '10',
            quoteVolume: '100'
        },
        {
            closeTime: 1675623602,
            openPrice: '1',
            highPrice: '3',
            lowPrice: '1',
            closePrice: '3',
            volume: '10',
            quoteVolume: '100'
        },
        {
            closeTime: 1675537201,
            openPrice: '1',
            highPrice: '3',
            lowPrice: '1',
            closePrice: '3',
            volume: '10',
            quoteVolume: '100'
        },
    ]
};

const dayRangeCandles = dayCandles['86400'].map((candle) => {
    return new Candle(
        Number(candle.highPrice),
        Number(candle.lowPrice),
        Number(candle.openPrice),
        Number(candle.closePrice),
        candle.closeTime
    )
});

export { dayRangeCandles }