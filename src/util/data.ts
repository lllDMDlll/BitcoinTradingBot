import {Times} from "../enums/time";
import {Range, RangeType} from "../types/Range";
import {Swing, SwingType} from "../types/Swing";
import {Gap, GapType} from "../types/Gap";
import {Candle} from "../types/Candle";
import {Event} from "../types/Event";
import {Mode} from "../enums/mode";

export type SLTP = {
    TakeProfit: number,
    StopLoss: number
}

class DataUtil {
    halfDay?: Range;
    day?: Range;
    twoDay?: Range;

    swingLows: Swing[] = [];
    swingHighs: Swing[] = [];
    sigSwingLows: Swing[] = [];
    sigSwingHighs: Swing[] = [];
    gapUps: Gap[] = [];
    gapDowns: Gap[] = [];

    getTradingMode = (event: Event): Mode => {
        const resource = event.resources.pop()?.match(/[^/]+$/)?.pop();
        if (resource) {
            switch (resource) {
                case "long_trades_only":
                    return Mode.LongOnly
                case "short_trades_only":
                    return Mode.ShortOnly
                default:
                    return Mode.AllTrades
            }
        }
        return Mode.AllTrades
    }

    /**
     * Checks if the current time falls within operating hours (12AM - 6PM)
     * and during the work week (Mon-Fri)
     * @param currentTime - Current time (in seconds)
     * @returns {boolean}
     */
    isWorkHours = (currentTime: Date): boolean => {
        // const convertedTime = changeTimeZone(curDate, 5);
        return (
            currentTime.getHours() >= 5 &&
            currentTime.getHours() <= 23 &&
            currentTime.getDay() !== 0 &&
            currentTime.getDay() !== 6
        )
    }

    /**
     * Filter candles array to only include candles in the provided range
     * @param candles - Array of Candles
     * @param start - Start time (in seconds)
     * @param end - End time (in seconds)
     * @returns {Candle[]}
     */
    filterCandles = (candles: Candle[], start: number, end: number): Candle[] => {
        return candles.filter((candle) => (candle.time >= start) && (candle.time <= end));
    }

    /**
     * Sets the ranges used for entry and exit logic
     * @param candles - Array of candles
     * @param currentTime - Current time (in seconds)
     */
    setRanges = (candles: Candle[], currentTime: number): void => {
        this.halfDay = new Range(this.filterCandles(
            candles,
            currentTime - 12*Times.HOUR,
            currentTime
        ), RangeType.HalfDay);
        this.day = new Range(this.filterCandles(
            candles,
            currentTime - Times.DAY,
            currentTime
        ), RangeType.Day);
        this.twoDay = new Range(this.filterCandles(
            candles,
            currentTime - 2*Times.DAY,
            currentTime
        ), RangeType.TwoDay);
    }

    /**
     * Gets percentage difference between two numbers
     * @param current - Current value
     * @param previous - Previous value
     * @returns {number}
     */
    getChange = (current: number, previous: number): number => {
        return ((current-previous) / previous) * 100
    }

    /**
     * Detect swing low and add it to the list of swing lows
     * @param current - Current candle
     * @param prev - Previous candle
     * @param prev2 - Previous two candle
     * @returns {boolean}
     */
    detectSwingLow = (current: Candle, prev: Candle, prev2: Candle): boolean => {
        if((current.low > prev.low) && (prev.low < prev2.low)) {
            this.swingLows.push(new Swing(Math.max(prev2.high, current.high), prev.low, prev.time, SwingType.Low));
            return true;
        }
        return false;
    }

    /**
     * Detect swing high and add it to the list of swing highs
     * @param current - Current candle
     * @param prev - Previous candle
     * @param prev2 - Previous two candle
     * @returns {boolean}
     */
    detectSwingHigh = (current: Candle, prev: Candle, prev2: Candle): boolean => {
        if((current.high < prev.high) && (prev.high > prev2.high)) {
            this.swingHighs.push(new Swing(prev.high, Math.min(prev2.low, current.low), prev.time, SwingType.High))
            return true;
        }
        return false;
    }

    /**
     * Detect significant swing low and add it to the list of significant swing lows
     * @param current - Current candle
     * @param prev - Previous candle
     * @param prev2 - Previous two candle
     * @returns {boolean}
     */
    detectSigSwingLow = (current: Candle, prev: Candle, prev2: Candle): boolean | undefined => {
        if(this.swingLows.length > 0) {
            const prevSwing = this.swingLows.pop();
            if(
                (current.low > prev.low) &&
                (prev.low < prev2.low) &&
                (prevSwing && this.getChange(prev.low, prevSwing.low) <= -0.25)
            ) {
                this.sigSwingLows.push(new Swing(Math.max(prev2.high, current.high), prev.low, prev.time, SwingType.Low));
                return true;
            }
            prevSwing && this.swingLows.push(prevSwing);
            return false;
        }
    }

    /**
     * Detect significant swing high and add it to the list of significant swing highs
     * @param current - Current candle
     * @param prev - Previous candle
     * @param prev2 - Previous two candle
     * @returns {boolean}
     */
    detectSigSwingHigh = (current: Candle, prev: Candle, prev2: Candle): boolean | undefined => {
        if(this.swingHighs.length > 0) {
            const prevSwing = this.swingHighs.pop();
            if(
                (current.high < prev.high) &&
                (prev.high > prev2.high) &&
                (prevSwing && this.getChange(prev.high, prevSwing.high) >= 0.25)
            ) {
                this.sigSwingHighs.push(new Swing(prev.high, Math.min(prev2.low, current.low), prev.time, SwingType.High));
                return true;
            }
            prevSwing && this.swingHighs.push(prevSwing);
            return false;
        }
    }

    /**
     * Detect a daily swing low using the average of the candles and close price to form a trend
     * @param current - Current day candle
     * @param prev - Previous day candle
     * @param prev2 - Previous 2 day candle
     * @returns {boolean}
     */
    detectDaySwingLow = (current: Candle, prev: Candle, prev2: Candle): boolean => {
        return (current.low > prev.low) && (prev.low < prev2.low) && (current.close > prev.close);
    }

    /**
     * Detect a daily swing high using the average of the candles and open price to form a trend
     * @param current - Current day candle
     * @param prev - Previous day candle
     * @param prev2 - Previous 2 day candle
     * @returns {boolean}
     */
    detectDaySwingHigh = (current: Candle, prev: Candle, prev2: Candle): boolean => {
        return (current.high < prev.high) && (prev.high > prev2.high) && (current.open < prev.open);
    }

    /**
     * Find and return the last daily swing. Return undefined if none are found.
     * @param candles - Array of daily candles.
     * @param time - Time of current candle. Check for swing before this time.
     * @param type - Type of swing to look for.
     * @returns {Swing | undefined}
     */
    getLastDaySwing = (candles: Candle[], time: number): Swing | undefined => {
        const currentDate = (new Date(time * 1000)).getDate();
        for(let i=0; i<7; i++) {
            const tempDate = new Date();
            tempDate.setDate(currentDate - (i+1));
            const current = candles.filter(candle => {
                const candleDay = (new Date(candle.time * 1000)).getDate();
                return candleDay === tempDate.getDate();
            })[0];
            tempDate.setDate(currentDate - (i+2));
            const prev = candles.filter(candle => {
                const candleDay = (new Date(candle.time * 1000)).getDate();
                return candleDay === tempDate.getDate();
            })[0];
            tempDate.setDate(currentDate - (i+3));
            const prev2 = candles.filter(candle => {
                const candleDay = (new Date(candle.time * 1000)).getDate();
                return candleDay === tempDate.getDate();
            })[0];
            if(current && prev && prev2) {
                if (this.detectDaySwingLow(current, prev, prev2)) {
                    return new Swing(Math.max(prev2.high, current.high), prev.low, prev.time, SwingType.Low);
                } else if (this.detectDaySwingHigh(current, prev, prev2)) {
                    return new Swing(prev.high, Math.min(prev2.low, current.low), prev.time, SwingType.High);
                }
            }
        }
        return undefined
    }

    /**
     * Detects a fair value gap up and adds it to the array of gap ups if record is set to true
     * @param current - Current candle
     * @param prev - Previous candle
     * @param prev2 - Previous two candle
     * @param record - Flag to indicate whether to record the gap in the array of gap ups
     * @returns {boolean | undefined}
     */
    detectGapUp = (current: Candle, prev: Candle, prev2: Candle, record = true): boolean | undefined => {
        const gapDiff = current.low - prev2.high;
        const candleDiff = prev.high - prev.low;
        if((gapDiff > 0) && (gapDiff/candleDiff > 0.2)) {
            if(record) {
                this.gapUps.push(new Gap(current.low, (current.low + prev2.high)/2, prev2.high, current.time, GapType.Up));
            }
            return true;
        }
    }

    /**
     * Detects a fair value gap down and adds it to the array of gap downs if record is set to true
     * @param current - Current candle
     * @param prev - Previous candle
     * @param prev2 - Previous two candle
     * @param record - Flag to indicate whether to record the gap in the array of gap ups
     * @returns {boolean | undefined}
     */
    detectGapDown = (current: Candle, prev: Candle, prev2: Candle, record = true): boolean | undefined => {
        const gapDiff = prev2.low - current.high;
        const candleDiff = prev.high - prev.low;
        if((gapDiff > 0) && (gapDiff/candleDiff > 0.2)) {
            if(record) {
                this.gapDowns.push(new Gap(prev2.low, (prev2.low + current.high)/2, current.high, current.time, GapType.Down));
            }
            return true;
        }
    }

    /**
     * Checks if the price is in a premium for the given range
     * @param price - Price to check
     * @param rangeType - Type of range
     * @returns {boolean}
     */
    isPremium = (price: number, rangeType: RangeType): boolean => {
        switch (rangeType) {
            case RangeType.Day:
                return this.day ? price > this.day.middle : false;
            case RangeType.TwoDay:
                return this.twoDay ? price > this.twoDay.middle : false;
            default:
                return this.halfDay ? price > this.halfDay.middle : false;
        }
    }

    /**
     * Checks if the price is in a discount for the given range
     * @param price - Price to check
     * @param rangeType - Type of range
     * @returns {boolean}
     */
    isDiscount = (price: number, rangeType: RangeType): boolean => {
        switch (rangeType) {
            case RangeType.Day:
                return this.day ? price <= this.day.middle : false;
            case RangeType.TwoDay:
                return this.twoDay ? price <= this.twoDay.middle : false;
            default:
                return this.halfDay ? price <= this.halfDay.middle : false;
        }
    }

    getGapsFromCandles = (candles: Candle[]): Gap[] => {
        const gaps: Gap[] = [];
        candles.forEach((candle, i) => {
            if(i > 1) {
                if(this.detectGapUp(candle, candles[i-1], candles[i-2], false)) {
                    gaps.push(new Gap(
                        candle.low,
                        (candle.low + candles[i-2].high)/2,
                        candles[i-2].high,
                        candle.time,
                        GapType.Up
                    ));
                } else if(this.detectGapDown(candle, candles[i-1], candles[i-2], false)) {
                    gaps.push(new Gap(
                        candles[i-2].low,
                        (candles[i-2].low + candle.high)/2,
                        candle.high,
                        candle.time,
                        GapType.Down
                    ));
                }
            }
        });
        return gaps;
    }

    /**
     * Returns the list of swing lows
     * @returns {Swing[]}
     */
    getSwingLows = (): Swing[] => {
        return this.swingLows;
    }

    /**
     * Returns the list of swing highs
     * @returns {Swing[]}
     */
    getSwingHighs = (): Swing[] => {
        return this.swingHighs;
    }

    /**
     * Returns an object containing the stop loss and take profit values
     * for long positions based on the entry price.
     * @param entryPrice
     * @returns {SLTP}
     */
    getLongSLTP = (entryPrice: number): SLTP => {
        const stopLoss = Math.round((entryPrice*0.9975 + Number.EPSILON) * 100) / 100;
        const takeProfit = Math.round((entryPrice*1.0075 + Number.EPSILON) * 100) / 100;
        return {
            StopLoss: stopLoss,
            TakeProfit: takeProfit
        }
    }

    /**
     * Returns an object containing the stop loss and take profit values
     * for short positions based on the entry price.
     * @param entryPrice
     * @returns {SLTP}
     */
    getShortSLTP = (entryPrice: number): SLTP => {
        const stopLoss = Math.round((entryPrice*1.0025 + Number.EPSILON) * 100) / 100;
        const takeProfit = Math.round((entryPrice*0.9925 + Number.EPSILON) * 100) / 100;
        return {
            StopLoss: stopLoss,
            TakeProfit: takeProfit
        }
    }

    /**
     * Clears the list of gaps
     */
    clearGaps = () => {
        this.gapDowns = [];
        this.gapUps = [];
    }

    /**
     * Clears the list of swings
     */
    clearSwings = () => {
        this.swingLows = [];
        this.swingHighs = [];
    }

    getHalfDayRange = () => {
        return this.halfDay;
    }

    getDayRange = () => {
        return this.day;
    }

    getTwoDayRange = () => {
        return this.twoDay;
    }

}

export { DataUtil }