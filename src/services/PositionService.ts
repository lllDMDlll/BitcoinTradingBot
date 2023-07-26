import {Times} from "../enums/time";
import {Position, PositionType} from "../types/Position";
import {krakenFuturesTestClient} from "../clients/kraken";
import {Candle} from "../types/Candle";
import {DataUtil, SLTP} from "../util/data";
import {SwingType} from "../types/Swing";
import {Gap, GapType} from "../types/Gap";
import {Mode} from "../enums/mode";

class PositionService {
    private dataUtils;
    private dayCandles: Candle[];
    private fiveMinuteCandles: Candle[];

    private entries: any[];
    private misses: any[];

    constructor(fiveMinuteCandles: Candle[], dayCandles: Candle[], dataUtils: DataUtil) {
        this.dataUtils = dataUtils;
        this.dayCandles = dayCandles;
        this.fiveMinuteCandles = fiveMinuteCandles;
        this.entries = [];
        this.misses = [];
    }

    findEntry = async (current: Candle, prev: Candle, prev2: Candle, asset: string, mode: Mode, execute = false): Promise<boolean> => {
        if (mode !== Mode.ShortOnly && this.dataUtils.detectSigSwingHigh(current, prev, prev2)) {
            if (this.dataUtils.isWorkHours(new Date(current.time * 1000))) {
                let entryDetected = false;
                const daySwing = this.dataUtils.getLastDaySwing(this.dayCandles, current.time);
                if (mode === Mode.LongOnly || daySwing?.type === SwingType.Low) {
                    // check for existing gap in 15min
                    const tempGaps = this.dataUtils.gapUps;
                    let idealGap: Gap | undefined = undefined;
                    while (tempGaps.length > 0) {
                        const curGap = tempGaps.pop();
                        if (curGap && curGap.time < (current.time - 12 * Times.HOUR)) {
                            break;
                        }
                        if (curGap?.type === GapType.Up && !curGap.filled) {
                            if (idealGap) {
                                idealGap = curGap.bottom < idealGap.bottom ? curGap : idealGap;
                            } else {
                                idealGap = curGap;
                            }
                        }
                    }
                    if (idealGap && this.dataUtils.isDiscount(idealGap.bottom, 0.5) && execute) {
                        // gap detected
                        entryDetected = true;
                        const sltp: SLTP = this.getLongSLTP(idealGap.bottom);
                        this.entries.push(new Position(
                            idealGap.bottom,
                            sltp.StopLoss,
                            sltp.TakeProfit,
                            current.time,
                            idealGap.time,
                            PositionType.Long
                        ));
                        const accounts = await krakenFuturesTestClient.getAccounts();
                        if (idealGap) {
                            const availableBalance = Number(accounts.data.accounts.flex.currencies.USD.available);
                            const orderSize = (availableBalance * 0.1)/idealGap.bottom;
                            return krakenFuturesTestClient.sendOrder(
                                "lmt",
                                "PF_XBTUSD",
                                "buy",
                                orderSize,
                                idealGap.bottom).then((response: any) => {
                                if (response.data.result === "success") {
                                    console.log("Successfully placed long order.");
                                    console.log(response.data);
                                    return true;
                                } else {
                                    console.log("Error placing long order: ", response.data);
                                    return false;
                                }
                            });
                        }
                    } else if (execute) {
                        this.misses.push({
                            Type: "Long Entry Missed",
                            Time: new Date(current.time * 1000).toLocaleString(),
                            Price: idealGap?.bottom,
                            Reason: "Not in discount"
                        });
                    }
                    // check for gaps in 5min
                    if (!entryDetected) {
                        const filteredFiveMinute = this.dataUtils.filterCandles(
                            this.fiveMinuteCandles, current.time - Times.WEEK, current.time
                        );
                        const fiveMinGaps = this.dataUtils.getGapsFromCandles(filteredFiveMinute);
                        let idealGap5: Gap | undefined = undefined;
                        while (fiveMinGaps.length > 0) {
                            const curGap = fiveMinGaps.pop();
                            if (curGap && curGap.time < (current.time - 12 * Times.HOUR)) {
                                break;
                            }
                            if (curGap?.type === GapType.Up && !curGap.filled) {
                                if (idealGap5) {
                                    idealGap5 = curGap.bottom < idealGap5.bottom ? curGap : idealGap5;
                                } else {
                                    idealGap5 = curGap;
                                }
                            }
                        }
                        if (idealGap5 !== undefined && this.dataUtils.isDiscount(idealGap5.bottom, 0.5) && execute) {
                            // gap detected
                            const sltp5 = this.getLongSLTP(idealGap5.bottom);
                            this.entries.push(new Position(
                                idealGap5.bottom,
                                sltp5.StopLoss,
                                sltp5.TakeProfit,
                                current.time,
                                idealGap5.time,
                                PositionType.Long
                            ));
                            const accounts = await krakenFuturesTestClient.getAccounts();
                            if (idealGap5) {
                                const availableBalance = Number(accounts.data.accounts.flex.currencies.USD.available);
                                const orderSize = (availableBalance * 0.1)/idealGap5.bottom;
                                return krakenFuturesTestClient.sendOrder(
                                    "lmt",
                                    "PF_XBTUSD",
                                    "buy", orderSize, idealGap5.bottom).then((response: any) => {
                                    if (response.data.result === "success") {
                                        console.log("Successfully placed long order.");
                                        console.log(response.data);
                                        return true;
                                    } else {
                                        console.log("Error placing long order: ", response.data);
                                        return false;
                                    }
                                });
                            }
                        } else if (execute) {
                            this.misses.push({
                                Type: "Long Entry Missed on 5 min",
                                Time: new Date(current.time * 1000).toLocaleString(),
                                Price: idealGap5?.bottom,
                                Reason: "Not in discount"
                            });
                        }
                    }
                } else if (execute) {
                    this.misses.push({
                        Type: "Long Entry Missed",
                        Time: new Date(current.time * 1000).toLocaleString(),
                        Price: 0,
                        Reason: `Last day swing was not a swing low: ${daySwing}`
                    });
                }
            }
        }

        if (mode !== Mode.LongOnly && this.dataUtils.detectSigSwingLow(current, prev, prev2)) {
            if (this.dataUtils.isWorkHours(new Date(current.time * 1000))) {
                let entryDetected = false;
                const daySwing = this.dataUtils.getLastDaySwing(this.dayCandles, current.time);
                if (mode === Mode.ShortOnly || daySwing?.type === SwingType.High) {
                    // check for existing gap in 15min
                    const tempGaps = this.dataUtils.gapDowns;
                    let idealGap: Gap | undefined = undefined;
                    while (tempGaps.length > 0) {
                        const curGap = tempGaps.pop();
                        if (curGap && curGap.time < (current.time - 12 * Times.HOUR)) {
                            break;
                        }
                        if (curGap?.type === GapType.Down && !curGap.filled) {
                            if (idealGap) {
                                idealGap = curGap.top > idealGap.top ? curGap : idealGap;
                            } else {
                                idealGap = curGap;
                            }
                        }
                    }
                    if (idealGap !== undefined && this.dataUtils.isPremium(idealGap.top, 0.5) && execute) {
                        // gap detected
                        const sltp = this.getShortSLTP(idealGap.top);
                        entryDetected = true;
                        this.entries.push(new Position(
                            idealGap.top,
                            sltp.StopLoss,
                            sltp.TakeProfit,
                            current.time,
                            idealGap.time,
                            PositionType.Short
                        ));
                        const accounts = await krakenFuturesTestClient.getAccounts();
                        if (idealGap) {
                            const availableBalance = Number(accounts.data.accounts.flex.currencies.USD.available);
                            const orderSize = (availableBalance * 0.1)/idealGap.top;
                            return krakenFuturesTestClient.sendOrder(
                                "lmt",
                                "PF_XBTUSD",
                                "sell", orderSize, idealGap.top).then((response: any) => {
                                if (response.data.result === "success") {
                                    console.log("Successfully placed short order.");
                                    console.log(response.data);
                                    return true;
                                } else {
                                    console.log("Error placing short order: ", response.data);
                                    return false;
                                }
                            });
                        }
                    } else if(execute) {
                        this.misses.push({
                            Type: "Short Entry Missed",
                            Time: new Date(current.time * 1000).toLocaleString(),
                            Price: idealGap?.top,
                            Reason: "Not in premium"
                        });
                    }
                    // check for gaps in 5min
                    if (!entryDetected) {
                        const filteredFiveMinute = this.dataUtils.filterCandles(
                            this.fiveMinuteCandles, current.time - Times.WEEK, current.time
                        );
                        const fiveMinGaps = this.dataUtils.getGapsFromCandles(filteredFiveMinute);
                        let idealGap5: Gap | undefined = undefined;
                        while (fiveMinGaps.length > 0) {
                            const curGap = fiveMinGaps.pop();
                            if (curGap && curGap.time < (current.time - 12 * Times.HOUR)) {
                                break;
                            }
                            if (curGap?.type === GapType.Down && !curGap.filled) {
                                if (idealGap5) {
                                    idealGap5 = curGap.top > idealGap5.top ? curGap : idealGap5;
                                } else {
                                    idealGap5 = curGap;
                                }
                            }
                        }
                        if (idealGap5 !== undefined && this.dataUtils.isPremium(idealGap5.top, 0.5) && execute) {
                            // gap detected
                            const sltp5 = this.getShortSLTP(idealGap5.top);
                            this.entries.push(new Position(
                                idealGap5.top,
                                sltp5.StopLoss,
                                sltp5.TakeProfit,
                                current.time,
                                idealGap5.time,
                                PositionType.Short
                            ));
                            const accounts = await krakenFuturesTestClient.getAccounts();
                            if (idealGap5) {
                                const availableBalance = Number(accounts.data.accounts.flex.currencies.USD.available);
                                const orderSize = (availableBalance * 0.1)/idealGap5.top;
                                return krakenFuturesTestClient.sendOrder(
                                    "lmt",
                                    "PF_XBTUSD",
                                    "sell", orderSize, idealGap5.top).then((response: any) => {
                                    if (response.data.result === "success") {
                                        console.log("Successfully placed short order.");
                                        console.log(response.data);
                                        return true;
                                    } else {
                                        console.log("Error placing short order: ", response.data);
                                        return false;
                                    }
                                });
                            }
                        } else if(execute) {
                            this.misses.push({
                                Type: "Short Entry Missed in 5 min",
                                Time: new Date(current.time * 1000).toLocaleString(),
                                Price: idealGap5?.top,
                                Reason: "Not in premium"
                            });
                        }
                    }
                } else if(execute) {
                    this.misses.push({
                        Type: "Short Entry Missed",
                        Time: new Date(current.time * 1000).toLocaleString(),
                        Price: 0,
                        Reason: `Last day swing was not a swing high: ${daySwing}`
                    });
                }
            }
        }
        return false;
    }

    getLongSLTP = (entryPrice: number): SLTP => {
        const swingLows = this.dataUtils.getSwingLows();
        const swingHighs = this.dataUtils.getSwingHighs();
        const stopLossSwing = swingLows
            .filter(swing => this.dataUtils.getChange(entryPrice, swing.low) > 0.25)
            .pop();
        const stopLoss = stopLossSwing ? stopLossSwing.low : entryPrice*0.9975;
        const slDiff = this.dataUtils.getChange(entryPrice, stopLoss);
        const takeProfitSwing = swingHighs
            .filter(swing => {
                const returnPerc = this.dataUtils.getChange(swing.high, entryPrice);
                return returnPerc > 3*slDiff && returnPerc < 8*slDiff;
            }).pop();
        const takeProfit = takeProfitSwing ? takeProfitSwing.high : entryPrice*(1+(3*slDiff)/100);
        return {
            StopLoss: stopLoss,
            TakeProfit: takeProfit
        };
    }

    getShortSLTP = (entryPrice: number): SLTP => {
        const swingHighs = this.dataUtils.getSwingHighs();
        const swingLows = this.dataUtils.getSwingLows();
        const stopLossSwing = swingHighs
            .filter(swing => this.dataUtils.getChange(swing.high, entryPrice) > 0.25)
            .pop();
        const stopLoss = stopLossSwing ? stopLossSwing.high : entryPrice*1.0025;
        const slDiff = this.dataUtils.getChange(stopLoss, entryPrice);
        const takeProfitSwing = swingLows
            .filter(swing => {
                const returnPerc = this.dataUtils.getChange(entryPrice, swing.low);
                return returnPerc > 3*slDiff && returnPerc < 8*slDiff;
            }).pop();
        const takeProfit = takeProfitSwing ? takeProfitSwing.low : entryPrice*(1-(3*slDiff)/100);
        return {
            StopLoss: stopLoss,
            TakeProfit: takeProfit
        };
    }

    logEntries = () => {
        const convertedEntries = this.entries.map(entry => {
            return {
                Entry: entry.entryPrice,
                StopLoss: entry.stopLoss,
                TakeProfit: entry.takeProfit,
                Time: new Date(entry.entryTime * 1000).toLocaleString(),
                GapTime: new Date(entry.gapTime * 1000).toLocaleString(),
                Type: entry.type,
                SellPrice: entry.sellPrice ?? "No Exit",
                SellTime: entry.sellTime ? new Date(entry.sellTime * 1000).toLocaleString() : "No Exit"
            }
        });
        if(convertedEntries.length > 0) {
            console.warn("Entries: ", convertedEntries);
        } else {
            console.log("No new entries");
        }
    }

    logMisses = () => {
        console.log("Misses: ", this.misses);
    }

    clearEntries = () => {
        this.entries = [];
    }

    clearMisses = () => {
        this.misses = [];
    }
}

export { PositionService }