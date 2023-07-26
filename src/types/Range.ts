import { Candle } from "./Candle";

enum RangeType {
    HalfDay,
    Day,
    TwoDay
}

class Range {
    candles: Candle[];
    high = 0;
    middle: number;
    low = 0;
    type: RangeType

    constructor(candles: Candle[], type: RangeType) {
        this.candles = candles;
        this.setHighLow(candles);
        this.middle = this.calculateMean(candles.map((c) => c.close));
        this.type = type;
    }

    setHighLow = (candles: Candle[]) => {
        this.high = candles.reduce((prev, curr) => prev.high > curr.high ? prev : curr).high;
        this.low = candles.reduce((prev, curr) => prev.low < curr.low ? prev : curr).low;
    }

    calculateMean = (values: number[]) => {
        return values.reduce((a, b) => Number(a) + Number(b)) / values.length
    }
}

export { Range, RangeType }