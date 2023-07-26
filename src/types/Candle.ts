class Candle {
    high: number;
    low: number;
    open: number;
    close: number;
    time: number;

    constructor(high: number, low: number, open: number, close: number, time: number) {
        this.high = high;
        this.low = low;
        this.open = open;
        this.close = close;
        this.time = time;
    }
}

export { Candle }